import { fabric } from "fabric";
import { gifToSprite, SpriteResult, ErrorResult } from "./gifToSprite";

const [PLAY, PAUSE, STOP] = [0, 1, 2] as const;
type GifStatus = typeof PLAY | typeof PAUSE | typeof STOP;

export interface FabricGifImage extends fabric.Image {
  play: () => void;
  pause: () => void;
  stop: () => void;
  getStatus: () => string;
}

type GifInput = string | File;

/**
 * fabricGif "async"
 * Mainly a wrapper for gifToSprite
 * @param {GifInput} gif can be a URL, dataURL or an "input File"
 * @param {number} maxWidth Optional, scale to maximum width
 * @param {number} maxHeight Optional, scale to maximum height
 * @param {number} maxDuration Optional, in milliseconds reduce the gif frames to a maximum duration, ex: 2000 for 2 seconds
 * @returns {Promise<FabricGifImage | ErrorResult>} {error} object if any or a 'fabric.image' instance of the gif with new 'play', 'pause', 'stop' methods
 */
export const fabricGif = async (
  gif: GifInput,
  maxWidth?: number,
  maxHeight?: number,
  maxDuration?: number
): Promise<FabricGifImage | ErrorResult> => {
  const result = await gifToSprite(gif, maxWidth, maxHeight, maxDuration);

  if ('error' in result) return result;

  const { dataUrl, delay, frameWidth, framesLength } = result as SpriteResult;

  return new Promise((resolve) => {
    fabric.Image.fromURL(dataUrl, (img) => {
      const sprite = img.getElement() as HTMLImageElement;
      let framesIndex = 0;
      let start = performance.now();
      let status: GifStatus;

      img.width = frameWidth;
      img.height = sprite.naturalHeight;
      //img.set('mode', 'image');
      img.set('top', 200);
      img.set('left', 200);
        
      (img as FabricGifImage)._render = function (ctx: CanvasRenderingContext2D) {
        if (status === PAUSE || (status === STOP && framesIndex === 0)) return;
        const now = performance.now();
        const delta = now - start;
        if (delta > delay) {
          start = now;
          framesIndex++;
        }
        if (framesIndex === framesLength || status === STOP) framesIndex = 0;
        ctx.drawImage(
          sprite,
          frameWidth * framesIndex,
          0,
          frameWidth,
          sprite.height,
          -this.width! / 2,
          -this.height! / 2,
          frameWidth,
          sprite.height
        );
      };

      (img as FabricGifImage).play = function () {
        status = PLAY;
        this.dirty = true;
      };

      (img as FabricGifImage).pause = function () {
        status = PAUSE;
        this.dirty = false;
      };

      (img as FabricGifImage).stop = function () {
        status = STOP;
        this.dirty = false;
      };

      (img as FabricGifImage).getStatus = () => ["Playing", "Paused", "Stopped"][status];

      (img as FabricGifImage).play();
      resolve(img as FabricGifImage);
    });
  });
};