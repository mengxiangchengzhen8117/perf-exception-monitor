import logger from './logger';
import ExceptionMonitor from './exception';
import PerformanceMonitor from './performance';
import FPSMonitor from './fps';

/**
 * 接入说明：
 * 1、Vue实例创建之前执行插件Vue.use(Monitor, options)
 * 参数说明：
 * exceptioinEventName 可选，默认'log_exception_report'
 * performanceEventName 可选，默认'log_performance_report'
 * enableMonitor 可选，默认自动监控并上报异常信息
 * fpsMin: 20 可选，默认20，范围[0, 60] fps低于该值就算卡顿
 * fpsEnable: 可选，是否允许监控页面卡顿情况，默认true
 */

// 处理兼容问题
if (!Function.prototype.bind) {
  /* eslint-disable */
  Function.prototype.bind = function (o) {
    if (typeof this !== 'function') {
      throw new TypeError('It is not a function.');
    }

    var obj = typeof o === 'object' ? o : window;
    var args = Array.prototype.slice.call(arguments, 1);
    var self = this;
    var fun = function () {
      return self.apply(this instanceof self ? this : obj, args.concat(Array.prototype.slice.call(arguments)));
    };

    //继承原函数的原型属性，也可fun.prototype = Object.create(this.prototype)
    function emptyFun() { }
    emptyFun.prototype = this.prototype;
    fun.prototype = new emptyFun();

    return fun;
  };
}

class PerfExceptionMonitor {
  ExceptionInstance = null;
  PerformanceInstance = null;
  FPSInstance = null;

  init(Vue, config = {}) {
    config = config || {};
    logger.setConfig(config);

    if (config.enableMonitor !== false) {
      this.runExceptionMonitor(config);

      let _oldLoad = window.onload;
      window.onload = () => {
        typeof _oldLoad === 'function' && _oldLoad.apply(window, Array.prototype.slice.call(arguments));
        this.runPerformanceMonitor(config);
        this.runFPSMonitor(config);
      };
      this.ExceptionInstance && (Vue.config.errorHandler = this.ExceptionInstance.vueErrorHandler);
    }
  }

  //运行异常监控，在其他脚本执行前执行
  runExceptionMonitor() {
    this.ExceptionInstance = new ExceptionMonitor();
    this.ExceptionInstance.run();
  }

  //运行性能监控，在window.onload时执行
  runPerformanceMonitor() {
    this.PerformanceInstance = new PerformanceMonitor();
    this.PerformanceInstance.run();
  }

  //运行FPS监控，监控页面卡顿，在window.onload时执行
  runFPSMonitor(config) {
    this.FPSInstance = new FPSMonitor(config);
    this.FPSInstance.run();
  }
}

export default {
  install(Vue, options) {
    const perfExceptionMonitor = new PerfExceptionMonitor();
    perfExceptionMonitor.init(Vue, options);
  }
};