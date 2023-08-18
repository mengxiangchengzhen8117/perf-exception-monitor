import logger from './logger';

class ExceptionMonitor {
  constructor() {
    this.vueErrorHandler = this.vueErrorHandler.bind(this);
    this.run = this.run.bind(this);
  }

  //在其他脚本执行前运行
  run() {
    //捕获未处理的js异常，外部js 配置了origin也可以捕获
    let _oldError = window.onerror;
    window.onerror = (message, url, lineNo, colNo, errObj) => {
      try {
        typeof _oldError === 'function' && _oldError.apply(window, Array.prototype.slice.call(arguments));
        let options;
        var string = message ? message.toLowerCase() : '';
        var substring = 'script error';
        //当加载自不同域的脚本中发生语法错误时，为避免信息泄露，语法错误的细节将不会报告，而代之简单的"Script error."
        if (string.indexOf(substring) > -1) {
          options = {
            warn_info: 'crossorigin: Script Error',
            extra: {
              type: 'Error',
              triggerType: 'onerror',
              message,
              errObj: errObj ? JSON.stringify(errObj) : ''
            }
          };
        } else {
          options = {
            warn_info: message,
            class_func_line: lineNo,
            stack: !!errObj && !!errObj.stack ? errObj.stack.toString() : '',
            extra: {
              type: 'Error',
              url: url || '',
              colNo: colNo || '',
              triggerType: 'onerror',
              errObj: errObj ? JSON.stringify(errObj) : ''
            }
          };
        }

        const extra = Object.assign({
          type: 'Unknow',
          triggerType: 'onunhandledrejection'
        }, options.extra);
        delete options.extra;
        this.send({
          warn_info: '捕获到错误信息',
          class_func_line: '',
          extra,
          ...options
        });
      } catch (ex) {
        //
      }
    };

    //捕获未处理的Promise错误、未显示处理的reject
    let _oldUnhandledrejection = window.onunhandledrejection;
    window.onunhandledrejection = (e) => {
      try {
        typeof _oldUnhandledrejection === 'function' && _oldUnhandledrejection.apply(window, Array.prototype.slice.call(arguments));
        this.promiseRejectionHandler(e);
      } catch (ex) {
        //
      }
    };

    // //console.error
    // let _oldConsoleError = console.error;
    // console.error = (errorObj) => {
    //   try {
    //     typeof _oldConsoleError === 'function' && _oldConsoleError.call(console, errorObj);
    //     let err = this.handleError(errorObj);
    //     let options = {
    //       warn_info: err.msg || '',
    //       class_func_line: err.line || '',
    //       stack: err.stack ? err.stack.toString() : '',
    //       extra: {
    //         type: 'console.error',
    //         colNo: err.col || '',
    //         triggerType: 'console.error'
    //       }
    //     };
    //     this.send(options);
    //   } catch (ex) {
    //     //
    //   }
    // };
  }

  // 通过Vue.config.errorHandler定义的错误监控方法，捕获vue 组件中所抛错误
  vueErrorHandler(err) {
    if (err) {
      let options = {
        warn_info: err.message || '捕获到错误信息',
        class_func_line: '',
        stack: err.stack ? err.stack.toString() : '',
        extra: {
          type: 'Error',
          triggerType: 'VueErrorHandler',
          errObj: JSON.stringify(err)
        }
      };
      this.send(options);
    }
  }

  send(params) {
    let options = {
      warn_info: '捕获到错误信息',
      class_func_line: '',
      ...params
    };
    logger.sendException(options);
  }

  captureException(ex) {
    if (!ex) {
      return;
    }
    let options;
    if (ex instanceof ErrorEvent && ex.error) {
      options = {
        warn_info: ex.message || 'ErrorEvent',
        class_func_line: ex.lineno || '',
        stack: ex.error && ex.error.stack ? ex.error.stack.toString() : '',
        extra: {
          type: 'ErrorEvent',
          colNo: ex.colno || '',
          fileName: ex.filename || '',
          errObj: JSON.stringify(ex.error)
        }
      };
    } else if (ex instanceof DOMException) {
      const name = ex.name || 'DOMException';
      options = {
        warn_info: ex.message ? `${name}:${ex.message}` : name,
        extra: {
          type: name
        }
      };
    } else if (ex instanceof Error) {
      const name = ex.name || 'Error';
      options = {
        warn_info: ex.message ? `${name}:${ex.message}` : name,
        class_func_line: ex.lineNumber || '',
        stack: ex.error && ex.error.stack ? ex.error.stack.toString() : '',
        extra: {
          type: name,
          colNo: ex.columnNumber || '',
          fileName: ex.filename || ''
        }
      };
    } else if (ex instanceof PromiseRejectionEvent) {
      options = {
        warn_info: 'PromiseRejection: ' + JSON.stringify(ex.reason),
        extra: {
          type: 'PromiseRejection'
        }
      };
    } else if (this.isPlainObject(ex)) {
      options = {
        warn_info: this.getCaptureExceptionOptions(ex),
        extra: {
          type: 'ErrorEvent',
          errObj: JSON.stringify(ex)
        }
      };
    }

    const extra = Object.assign({
      type: 'Unknow',
      triggerType: 'onunhandledrejection'
    }, options.extra);
    delete options.extra;
    this.send({
      warn_info: '捕获到错误信息',
      class_func_line: '',
      extra,
      ...options
    });
  }

  promiseRejectionHandler(event) {
    this.captureException(event);
  }

  getCaptureExceptionOptions(ex) {
    var keys = Object.keys(ex).sort();
    return 'Non-Error exception captured with keys:' + JSON.stringify(keys);
  }

  isPlainObject(obj) {
    if (typeof obj !== 'object' || obj === null) return false;

    let proto = obj;
    while (Object.getPrototypeOf(proto) !== null) {
      proto = Object.getPrototypeOf(proto);
    }
    return Object.getPrototypeOf(obj) === proto;
  }

  handleError(err) {
    try {
      if (err && err.stack) {
        let url = err.stack.match('https?://[^\n]+');
        url = url ? url[0] : '';
        let rowCols = url.match(':(\\d+):(\\d+)');
        if (!rowCols) {
          rowCols = [0, 0, 0];
        }
        return {
          msg: err.stack,
          line: rowCols[1],
          col: rowCols[2],
          fileUrl: url.replace(rowCols[0], '').replace(')', ''),
          stack: err.stack
        };
      } else {
        return err;
      }
    } catch (ex) {
      return err;
    }
  }
}

export default ExceptionMonitor;
