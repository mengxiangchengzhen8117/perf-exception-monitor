import Uilt from './util';

class Logger {
  static cacheConfig = {
    exceptioinEventName: '异常数据',
    performanceEventName: '性能数据'
  };

  setConfig(options) {
    Object.assign(Logger.cacheConfig, options || {});
  }

  /**
   * // 上报异常数据
   * warn_info：错误信息，此信息为开发⾃⼰输⼊关键信息，例如 try catch 信息，某个值为空后的异常逻辑等等
   * class_func_line: 错误当前定位的类名函数名和具体代码的⾏数，便于开发直接定位到具体位置
   *    前端无法动态获取到当前代码行数，就以第n个埋点上报0\1\2往后倒推标识
   * extra：扩展字段，选传
   *
  */
  sendException(options) {
    const op = JSON.parse(JSON.stringify(options));
    if (op && op.extra && typeof op.extra === 'string') {
      try {
        op.extra = JSON.parse(op.extra);
      } catch (e) {
        op.extra = {};
      }
    }
    const extra = Object.assign({
      url: location.href
    }, op.extra || {});
    extra.url = extra.url ? extra.url : location.href;
    delete op.extra;
    this.send(Logger.cacheConfig.exceptioinEventName, {
      ...op,
      warn_info: '捕获到错误信息',
      class_func_line: 'logger_sendException_0',//必传
      date: Uilt.formatDate('YYYY-MM-DD hh:mm:ss.S Z'),//必传
      ...extra
    });
  }

  /**
   * 上报性能数据
   * extra：扩展字段，选传
  */
  sendPerformance(options) {
    const op = JSON.parse(JSON.stringify(options));
    if (op && op.extra && typeof op.extra === 'string') {
      try {
        op.extra = JSON.parse(op.extra);
      } catch (e) {
        op.extra = {};
      }
    }
    const extra = Object.assign({
      url: location.href
    }, op.extra || {});
    delete op.extra;
    extra.url = extra.url ? extra.url : location.href;
    this.send(Logger.cacheConfig.performanceEventName, {
      ...op,
      ...extra
    });
  }

  send(event, options) {
    console.info(`🚀🚀🚀 ${event}:\n`);
    for (let k in options) {
      const type = Object.prototype.toString.call(options[k]);
      if (type == '[object Object]' || type == '[object Array]') {
        const arr = type == '[object Object]' ? ['{', '}'] : ['[', ']'];
        console.info(`  ${k}: ${arr[0]}\n`);
        for (let p in options[k]) {
          console.info(`    ${p}: ${JSON.stringify(options[k][p])},\n`);
        }
        console.info(`  ${arr[1]},\n`);
      } else {
        console.info(`  ${k}: ${options[k]},\n`);
      }
    }
    console.info(`🚀🚀🚀 end\n`);
    // 调api上传到服务器
  }
}

export default new Logger();