import logger from './logger';

const FPS_RECORD_INTERVAL = 600000;//每隔10分钟记录一次有效卡顿
let requestId;
//通过FPS监控网页流畅度
class FPSMonitor {
  constructor(config = {}) {
    this.config = Object.assign({
      fpsEnable: true,
      fpsMin: 20
    }, config);
    this.config.fpsMin = Number(this.config.fpsMin);
    this.config.fpsMin = Math.min(this.config.fpsMin, 60);
    this.config.fpsMin = Math.max(this.config.fpsMin, 0);
    this.config.fpsEnable = this.config.fpsEnable === true ? true : false;
  }

  run() {
    if (!requestId && this.config.fpsEnable) {
      setTimeout(() => {
        this.startLoop();
      }, 10000);
    }
  }

  startLoop() {//正常情况>=60 帧/s
    const requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame;
    if (requestAnimationFrame && performance) {
      let lastTime = performance.now();
      let frame = 0;
      let lastFameTime = performance.now();
      let fpsArr = [], last = 0;
      const loop = () => {
        let now = performance.now();
        let fs = (now - lastFameTime);
        lastFameTime = now;
        let fps = Math.round(1000 / fs);
        frame++;
        if (now > 1000 + lastTime) {
          fps = Math.round((frame * 1000) / (now - lastTime)); //计算时间达到一秒后的帧数
          frame = 0;
          lastTime = now;
        }
        fpsArr.push(fps);
        if (fpsArr.length > 3) {
          fpsArr.splice(0, fpsArr.length - 3);
        }

        const res = this.isLowFPS(fpsArr, this.config.fpsMin, 3);
        if (res.isLow) {
          fpsArr.splice(0, fpsArr.length);
          const current = new Date().getTime();
          if (!last || current - last > FPS_RECORD_INTERVAL) {
            last = current;
            this.send({
              fps: res.middleValue
            });
          }
        }
        requestId = requestAnimationFrame(loop);
      };

      loop();
    }
  }

  //连续3个fps低于20帧就认为出现卡顿情况
  isLowFPS(FPSList, below, number) {
    let isLow = false, middleValue = 0;
    if (FPSList.length >= number) {
      let count = 0, total = 0;
      for (let i = 0; i < FPSList.length; i++) {
        if (FPSList[i] < below) {
          total += FPSList[i];
          count++;
        } else {
          total = 0;
          count = 0;
        }
        if (count >= number) {
          isLow = true;
          middleValue = count ? Math.round(total / count) : 0;
          break;
        }
      }
    }
    return { isLow, middleValue };
  }

  send(data) {
    if (data) {
      logger.sendPerformance({
        fps: data.fps
      });
    }
  }
}

export default FPSMonitor;