// https://raw.githubusercontent.com/mgcrea/js-canvas-object-fit/master/src/index.js
// Without rotation handling
export const captureImageFromVideo = (
    ctx,
    video,
    x,
    y,
    width,
    height,
    { objectFit = 'none', offsetX = 1 / 2, offsetY = 1 / 2 } = {}
) => {
    const imageWidth = video.videoWidth;
    const imageHeight = video.videoHeight;
    // Resize values
    const resizeRatio = Math[objectFit === 'cover' ? 'max' : 'min'](width / imageWidth, height / imageHeight);
    const resizeWidth = imageWidth * resizeRatio;
    const resizeHeight = imageHeight * resizeRatio;
    // Cropping values
    const sWidth = imageWidth / (resizeWidth / width);
    const sHeight = imageHeight / (resizeHeight / height);
    const sX = (imageWidth - sWidth) * offsetX;
    const sY = (imageHeight - sHeight) * offsetY;
    // Draw
    ctx.drawImage(video, sX, sY, sWidth, sHeight, x, y, width, height);
};
