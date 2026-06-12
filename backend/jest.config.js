export default {
  testEnvironment: 'node',
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1', // Hỗ trợ import ES module có đuôi .js
  },
  clearMocks: true,
};
