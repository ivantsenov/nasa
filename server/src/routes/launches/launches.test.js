const request = require('supertest');
const app = require('../../app');
const { mongoConnect, mongoDisconnect } = require('../../db');
const { loadPlanetsData } = require('../../models/planets.model');

const apiVersion = '/v1';

describe('Launches API', () => {
  beforeAll(async () => {
    await mongoConnect();
    await loadPlanetsData();
  });

  afterAll(async () => {
    await mongoDisconnect();
  });

  describe('Test GET /launches', () => {
    test('It should response with 200 success', async () => {
      await request(app)
        .get(`${apiVersion}/launches`)
        .expect('Content-Type', /json/)
        .expect(200);
    });
  });

  describe('Test POST /launches', () => {
    const completeLaunchData = {
      mission: 'USS Enterprise',
      rocket: 'NCC 1701-D',
      target: 'Kepler-452 b',
      launchDate: '2022-09-23',
    };

    const launchDataWithoutDate = {
      mission: 'USS Enterprise',
      rocket: 'NCC 1701-D',
      target: 'Kepler-452 b',
    };

    const launchDataWithNullValues = {
      mission: 'USS Enterprise',
      rocket: 'NCC 1701-D',
      target: null,
      launchDate: '2022-09-23',
    };

    const launchDataWithInvalidDate = {
      mission: 'USS Enterprise',
      rocket: 'NCC 1701-D',
      target: 'Kepler-452 b',
      launchDate: 'helloo',
    };

    test('It should respond with 201 created', async () => {
      const response = await request(app)
        .post(`${apiVersion}/launches`)
        .send(completeLaunchData)
        .expect('Content-Type', /json/)
        .expect(201);

      const requestDate = new Date(completeLaunchData.launchDate).valueOf();
      const responseDate = new Date(response.body.launchDate).valueOf();

      expect(responseDate).toBe(requestDate);
      expect(response.body).toMatchObject(launchDataWithoutDate);
    });

    test('It should catch missing required properties', async () => {
      const response = await request(app)
        .post(`${apiVersion}/launches`)
        .send(launchDataWithNullValues)
        .expect('Content-Type', /json/)
        .expect(400);

      const responseError = { error: "target can't be empty" };

      expect(response.body).toStrictEqual(responseError);
    });

    test('It should catch invalid dates', async () => {
      const response = await request(app)
        .post(`${apiVersion}/launches`)
        .send(launchDataWithInvalidDate)
        .expect('Content-Type', /json/)
        .expect(400);

      const expectedError = { error: 'Invalid launch data' };

      expect(response.body).toStrictEqual(expectedError);
    });
  });
});
