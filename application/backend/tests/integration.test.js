// Unlike every other file in tests/, this one hits a REAL MongoDB and drives
// the app through actual HTTP requests via supertest — no mocks. The unit
// tests prove each piece's logic in isolation; this proves the pieces are
// actually wired together correctly (routing, middleware order, real
// Mongoose queries). Requires a reachable MongoDB — see
// tests/setupEnv.js for the default connection string, and
// .github/workflows/pr.yml's "backend" job for how CI provides one.
const mongoose = require('mongoose');
const request = require('supertest');
const createApp = require('../src/app');
const db = require('../src/db/connect');
const User = require('../src/models/User');
const Diagram = require('../src/models/Diagram');

const app = createApp();

beforeAll(async () => {
  await db.connect();
});

afterAll(async () => {
  await mongoose.connection.close();
});

afterEach(async () => {
  await User.deleteMany({});
  await Diagram.deleteMany({});
});

async function registerAndLogin(email) {
  await request(app).post('/api/auth/register').send({ email, password: 'correcthorse1' });
  const res = await request(app).post('/api/auth/login').send({ email, password: 'correcthorse1' });
  return res.body.token;
}

describe('health and readiness', () => {
  it('GET /healthz is always 200, unauthenticated', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
  });

  it('GET /readyz is 200 once MongoDB is connected', async () => {
    const res = await request(app).get('/readyz');
    expect(res.status).toBe(200);
  });
});

describe('auth flow', () => {
  it('registers, then logs in, then fetches the profile', async () => {
    const register = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@example.com', password: 'correcthorse1' });
    expect(register.status).toBe(201);
    expect(register.body.user.passwordHash).toBeUndefined();

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'correcthorse1' });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeTruthy();

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe('alice@example.com');
  });

  it('rejects a duplicate registration with 409', async () => {
    await request(app).post('/api/auth/register').send({ email: 'dup@example.com', password: 'correcthorse1' });
    const res = await request(app).post('/api/auth/register').send({ email: 'dup@example.com', password: 'correcthorse1' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_IN_USE');
  });

  it('rejects protected routes with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('diagram CRUD and ownership — FR-D7', () => {
  it('a user can save, list, fetch, update, and delete their own diagram', async () => {
    const token = await registerAndLogin('bob@example.com');
    const auth = { Authorization: `Bearer ${token}` };

    const save = await request(app)
      .post('/api/diagrams')
      .set(auth)
      .send({
        title: 'My Flow',
        sourceText: 'a simple login flow',
        diagramType: 'flowchart',
        mermaidSyntax: 'flowchart TD\nA-->B',
      });
    expect(save.status).toBe(201);
    const id = save.body._id;

    const list = await request(app).get('/api/diagrams').set(auth);
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);

    const getOne = await request(app).get(`/api/diagrams/${id}`).set(auth);
    expect(getOne.status).toBe(200);
    expect(getOne.body.title).toBe('My Flow');

    const update = await request(app).patch(`/api/diagrams/${id}`).set(auth).send({ title: 'Renamed' });
    expect(update.status).toBe(200);
    expect(update.body.title).toBe('Renamed');

    const del = await request(app).delete(`/api/diagrams/${id}`).set(auth);
    expect(del.status).toBe(204);

    const getAfterDelete = await request(app).get(`/api/diagrams/${id}`).set(auth);
    expect(getAfterDelete.status).toBe(404);
  });

  it('returns 404 — not 403 — when a second user requests the first user\'s diagram', async () => {
    const tokenA = await registerAndLogin('carol@example.com');
    const tokenB = await registerAndLogin('dave@example.com');

    const save = await request(app)
      .post('/api/diagrams')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        sourceText: 'carol\'s private diagram',
        diagramType: 'flowchart',
        mermaidSyntax: 'flowchart TD\nA-->B',
      });
    const id = save.body._id;

    const asOwner = await request(app).get(`/api/diagrams/${id}`).set('Authorization', `Bearer ${tokenA}`);
    expect(asOwner.status).toBe(200);

    const asStranger = await request(app).get(`/api/diagrams/${id}`).set('Authorization', `Bearer ${tokenB}`);
    expect(asStranger.status).toBe(404);

    const deleteAsStranger = await request(app).delete(`/api/diagrams/${id}`).set('Authorization', `Bearer ${tokenB}`);
    expect(deleteAsStranger.status).toBe(404);

    const stillThere = await request(app).get(`/api/diagrams/${id}`).set('Authorization', `Bearer ${tokenA}`);
    expect(stillThere.status).toBe(200);
  });

  it('rejects an oversized generation request before touching any provider', async () => {
    const token = await registerAndLogin('erin@example.com');
    const res = await request(app)
      .post('/api/diagrams/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'a'.repeat(2001) });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('every error response carries the same request id sent in the header', async () => {
    const res = await request(app)
      .get('/api/diagrams/not-a-valid-object-id')
      .set('Authorization', 'Bearer garbage-token')
      .set('x-request-id', 'test-fixed-id-123');

    expect(res.status).toBe(401);
    expect(res.body.error.requestId).toBe('test-fixed-id-123');
    expect(res.headers['x-request-id']).toBe('test-fixed-id-123');
  });
});
