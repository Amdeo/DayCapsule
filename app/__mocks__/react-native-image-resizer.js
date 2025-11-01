export default {
  createResizedImage: jest.fn().mockResolvedValue({
    uri: 'file:///path/to/thumbnail.jpg',
    width: 200,
    height: 200,
    size: 50000,
    name: 'thumbnail.jpg',
    path: 'file:///path/to/thumbnail.jpg',
  }),
};
