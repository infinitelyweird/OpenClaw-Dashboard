const supertest = require('supertest');
const app = require('./app');
const http = require('http');

let server;
let request;

beforeAll((done) => {
  server = http.createServer(app);
  server.listen(0, () => {
    const { port } = server.address();
    request = supertest(`http://localhost:${port}`);
    done();
  });
});

afterAll((done) => {
  server.close(done);
});

describe('Navigation Tests', () => {
  it('should serve the main index page', async () => {
    const res = await request.get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Dashboard');
  });

  it('should navigate to the network security route', async () => {
    const res = await request.get('/network-security');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Network Security Section');
  });

  it('should navigate to the admin route', async () => {
    const res = await request.get('/admin');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Admin Panel');
  });
});