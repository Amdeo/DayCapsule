export const launchCamera = jest.fn().mockResolvedValue({
  assets: [
    {
      uri: 'file:///path/to/photo.jpg',
      width: 1920,
      height: 1080,
      fileSize: 1024000,
      type: 'image/jpeg',
      fileName: 'photo.jpg',
    },
  ],
});

export const launchImageLibrary = jest.fn().mockResolvedValue({
  assets: [
    {
      uri: 'file:///path/to/photo.jpg',
      width: 1920,
      height: 1080,
      fileSize: 1024000,
      type: 'image/jpeg',
      fileName: 'photo.jpg',
    },
  ],
});

export const ImagePickerResponse = {};
