import request from 'supertest';
import nock from 'nock';
import { createApp } from '../src/app';

const app = createApp();

const SAMPLE_HTML = `
<!DOCTYPE html>
<html>
  <head>
    <title>Example Domain</title>
    <meta name="description" content="An example page for testing." />
  </head>
  <body>
    <h1>Example Domain</h1>
    <p>This domain is for use in illustrative examples in documents.</p>
    <img src="/logo.png" />
    <img src="https://cdn.example.com/banner.png" />
    <a href="/about">About</a>
    <a href="https://external-site.test/page">External</a>
  </body>
</html>
`;

beforeEach(() => {
  nock.cleanAll();
});

afterAll(() => {
  nock.restore();
});

describe('POST /api/audit', () => {
  it('rejects an invalid URL with 400 and a structured error', async () => {
    const res = await request(app).post('/api/audit').send({ url: 'not-a-url' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_URL');
    expect(res.body).toHaveProperty('requestId');
  });

  it('rejects an empty url', async () => {
    const res = await request(app).post('/api/audit').send({ url: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_URL');
  });

  it('rejects localhost / private addresses', async () => {
    const res = await request(app).post('/api/audit').send({ url: 'http://127.0.0.1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PRIVATE_ADDRESS_BLOCKED');
  });

  it('audits a valid URL and returns the expected response shape', async () => {
    nock('https://example-test.com')
      .head('/logo.png')
      .reply(200)
      .head('/banner.png')
      .reply(404)
      .get('/')
      .reply(200, SAMPLE_HTML, {
        'Content-Type': 'text/html',
        'Strict-Transport-Security': 'max-age=63072000',
      });

    nock('https://cdn.example.com').head('/banner.png').reply(200);

    const res = await request(app).post('/api/audit').send({ url: 'https://example-test.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('requestId');
    expect(res.body).toHaveProperty('cached');
    expect(res.body.data).toMatchObject({
      title: 'Example Domain',
      metaDescription: 'An example page for testing.',
      httpsEnabled: true,
      totalImages: 2,
      internalLinks: 1,
      externalLinks: 1,
    });
    expect(res.body.data.securityHeaders.strictTransportSecurity).toContain('max-age');
  });

  it('returns cached:true on the second identical request', async () => {
    nock('https://cached-test.com')
      .get('/')
      .reply(200, SAMPLE_HTML, { 'Content-Type': 'text/html' })
      .persist(false);

    const first = await request(app).post('/api/audit').send({ url: 'https://cached-test.com' });
    expect(first.status).toBe(200);
    expect(first.body.cached).toBe(false);

    // No nock interceptor registered for the second call - if the
    // service tries to hit the network again this request will fail,
    // proving the cached response was served instead.
    const second = await request(app).post('/api/audit').send({ url: 'https://cached-test.com' });
    expect(second.status).toBe(200);
    expect(second.body.cached).toBe(true);
    expect(second.body.data.title).toBe('Example Domain');
  });

  it('returns 408 when the target site times out', async () => {
    nock('https://slow-test.com').get('/').delay(6000).reply(200, SAMPLE_HTML);

    const res = await request(app).post('/api/audit').send({ url: 'https://slow-test.com' });
    expect(res.status).toBe(408);
    expect(res.body.error.code).toBe('REQUEST_TIMEOUT');
  }, 10000);

  it('returns 502 when the target site is unreachable', async () => {
    nock('https://unreachable-test.com').get('/').replyWithError('DNS lookup failed');

    const res = await request(app).post('/api/audit').send({ url: 'https://unreachable-test.com' });
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('FETCH_FAILED');
  });
});

describe('Rate limiting', () => {
  it('includes standard rate-limit headers on audit responses', async () => {
    nock('https://rl-test.com').get('/').reply(200, SAMPLE_HTML, { 'Content-Type': 'text/html' });
    const res = await request(app).post('/api/audit').send({ url: 'https://rl-test.com' });
    expect(res.headers).toHaveProperty('ratelimit-limit');
  });
});
