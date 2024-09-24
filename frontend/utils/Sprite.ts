import { fabric } from 'fabric';

interface SpriteOptions extends fabric.IImageOptions {
    spriteWidth?: number;
    spriteHeight?: number;
    spriteIndex?: number;
    frameTime?: number;
}

class Sprite extends fabric.Image {
    declare type: string;
    spriteWidth: number;
    spriteHeight: number;
    spriteIndex: number;
    frameTime: number;
    tmpCanvasEl!: HTMLCanvasElement;
    spriteImages!: HTMLImageElement[];
    animInterval!: number;
    onPlay?: () => void;

    constructor(element: HTMLImageElement, options: SpriteOptions = {}) {
        const defaultOptions: SpriteOptions = {
            spriteWidth: 50,
            spriteHeight: 72,
            spriteIndex: 0,
            frameTime: 100,
            scaleX: 1,
            scaleY: 1
        };
        const mergedOptions = { ...defaultOptions, ...options };
        
        super(element, mergedOptions);

        this.type = 'sprite';
        this.spriteWidth = mergedOptions.spriteWidth!;
        this.spriteHeight = mergedOptions.spriteHeight!;
        this.spriteIndex = mergedOptions.spriteIndex!;
        this.frameTime = mergedOptions.frameTime!;

        this.createTmpCanvas();
        this.createSpriteImages();

        // Ajustar el tamaño inicial
        this._updateDimensions();
    }

    _updateDimensions() {
        this.width = this.spriteWidth * (this.scaleX ?? 1);
        this.height = this.spriteHeight * (this.scaleY ?? 1);
        this.dirty = true;
    }

    // Sobrescribir los setters de scaleX y scaleY
    set scaleX(value: number) {
        this._set('scaleX', value);
        this._updateDimensions();
    }

    set scaleY(value: number) {
        this._set('scaleY', value);
        this._updateDimensions();
    }

    createTmpCanvas(): void {
        this.tmpCanvasEl = fabric.util.createCanvasElement();
        this.tmpCanvasEl.width = this.spriteWidth;
        this.tmpCanvasEl.height = this.spriteHeight;
    }

    createSpriteImages(): void {
        this.spriteImages = [];
        const steps = (this as any)._element.width / this.spriteWidth;
        for (let i = 0; i < steps; i++) {
            this.createSpriteImage(i);
        }
    }

    createSpriteImage(i: number): void {
        const tmpCtx = this.tmpCanvasEl.getContext('2d');
        if (!tmpCtx) return;

        tmpCtx.clearRect(0, 0, this.tmpCanvasEl.width, this.tmpCanvasEl.height);
        tmpCtx.drawImage(
            (this as any)._element, 
            i * this.spriteWidth, 0, 
            this.spriteWidth, this.spriteHeight,
            0, 0, 
            this.spriteWidth, this.spriteHeight
        );

        const dataURL = this.tmpCanvasEl.toDataURL('image/png');
        const tmpImg = fabric.util.createImage();

        tmpImg.src = dataURL;
        this.spriteImages.push(tmpImg);
    }

    render(ctx: CanvasRenderingContext2D): void {
        if (!this.spriteImages[this.spriteIndex]) return;

        const width = this.width ?? this.spriteWidth;
        const height = this.height ?? this.spriteHeight;

        const dx = -width / 2;
        const dy = -height / 2;

        ctx.drawImage(
            this.spriteImages[this.spriteIndex],
            dx,
            dy,
            width,
            height
        );
    }

    play(): void {
        this.animInterval = window.setInterval(() => {
            this.onPlay?.();
            this.dirty = true;
            this.spriteIndex++;
            if (this.spriteIndex === this.spriteImages.length) {
                this.spriteIndex = 0;
            }
            this.canvas?.requestRenderAll();
        }, this.frameTime);
    }

    stop(): void {
        clearInterval(this.animInterval);
    }

    static fromURL(url: string, callback?: ((image: Sprite) => any) | undefined, imgOptions?: SpriteOptions): fabric.Image {
        return fabric.util.loadImage(url, (img) => {
            const sprite = new Sprite(img, imgOptions);
            callback?.(sprite);
        }, null, '') as unknown as fabric.Image;
    }

    static async = true;
}

// Extend fabric namespace
declare module 'fabric' {
    namespace fabric {
        class Sprite extends Image {
            constructor(element: HTMLImageElement, options?: SpriteOptions);
            static fromURL(url: string, callback?: ((image: Sprite) => any) | undefined, imgOptions?: SpriteOptions): fabric.Image;
        }
    }
}

// Assign to fabric namespace
(fabric as any).Sprite = Sprite;