/**
 * 统计性能数据，指导前端页面优化
 * 优化前后关键数据对比依据
 */

import logger from './logger';

class PerformanceMonitor {
  constructor() {
    this.performanceTiming = {
      timing: {},
      memory: {},
      entries: {}
    };
  }

  run() {
    this.getPerformanceData();
  }

  getPerformanceData() {
    this.getPerformanceTiming();
    this.getPerformanceMemory();
    this.getPerformanceEntries();

    setTimeout(() => {
      this.send();
    }, 1000);
  }

  /**
   * 利用performance.timing api计算性能分析结果
   * performance.timing特性已经从 Web 标准中删除, 一些浏览器目前仍然支持
  */
  getPerformanceTiming() {
    if (window.performance && window.performance.timing) {
      let timing = window.performance.timing, obj = {};
      // 以下为网络情况
      // 【一般】重定向时间
      obj.redirect_time = timing.redirectEnd - timing.redirectStart;

      // 【重要】DNS 查询时间
      obj.domain_lookup = timing.domainLookupEnd - timing.domainLookupStart;

      // 【一般】TCP 建立连接握手的时间
      obj.tcp_connect = timing.connectEnd - timing.connectStart;

      // 以下为服务端响应情况
      // 【重要】资源请求完成的时间
      obj.assert_request = timing.responseEnd - timing.requestStart;

      // 以下为解析渲染、资源加载情况
      // 【重要】解析 DOM 树结构的时间
      // 解析 DOM 树结构的时间
      obj.dom_resolve = timing.domInteractive - timing.domLoading;
      // DOM 树解析完成，且网页内资源加载完成的时间（如 JS 脚本加载执行完毕）
      obj.dom_complete = timing.domComplete - timing.domInteractive;

      // 【重要】加载时间
      obj.load = timing.domComplete - timing.responseEnd;
      // 【重要】⽩屏时间
      obj.white = timing.domComplete - timing.navigationStart;
      Object.assign(this.performanceTiming.timing, obj);

      // LCP最大内容渲染, 可视区域中最⼤的内容元素呈现到屏幕上的时间，⽤以估算⻚⾯的主要内容对⽤户可⻅时间
      if (window.PerformanceObserver) {
        try {
          const po = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            if (entries && entries.length && entries[entries.length - 1]) {
              const largeEntry = entries[entries.length - 1];
              let lcp = largeEntry.renderTime || largeEntry.loadTime;
              Object.assign(this.performanceTiming.timing, { lcp });
            }
          });
          typeof po.observe === 'function' && po.observe({ type: 'largest-contentful-paint' });
        } catch (e) {
          console.error(e);
        }
      }
    }
  }

  /**
   * 利用performance.memory api计算内存占用情况
  */
  getPerformanceMemory() {
    if (window.performance && window.performance.memory) {
      const obj = {
        // 上下文内可用堆的最大体积，以字节计算
        jsHeapSizeLimit: window.performance.memory.jsHeapSizeLimit,
        // 已分配的堆体积，以字节计算
        totalJSHeapSize: window.performance.memory.totalJSHeapSize,
        // 【重要】当前 JS 堆活跃段（segment）的体积(包括V8引擎内部对象)，不能大于totalJSHeapSize，如果大于，有可能出现了内存泄漏
        usedJSHeapSize: window.performance.memory.usedJSHeapSize
      };
      Object.assign(this.performanceTiming.memory, obj);
    }
  }

  /**
   * 利用performance.entries api计算资源加载情况
  */
  getPerformanceEntries() {
    if (window.performance && window.performance.getEntries) {
      const entries = window.performance.getEntries();
      const resource = entries.filter(i => {
        return i && (i.initiatorType === 'link' || i.initiatorType === 'script');
      });

      // 【重要】资源加载超限情况
      const data = {};
      const durationArr = [], transferSizeArr = [];
      resource.forEach(item => {
        if (item && item.duration > 5000) {
          durationArr.push(`name: ${item.name}, duration: ${item.duration}`);
        }

        // item.transferSize === 0表示loaded from cache or a cross-origin request
        if (item && item.transferSize > 2000000) {
          transferSizeArr.push(`name: ${item.name}, transferSize: ${item.transferSize}`);
        }
      });
      durationArr.length && (data['资源加载时间超限duration>5000'] = durationArr.join('; '));
      transferSizeArr.length && (data['资源加载大小超限transferSize>2000000'] = transferSizeArr.join('; '));
      Object.assign(this.performanceTiming.entries, data);

      // 各种资源的总量统计
      const obj = entries.reduce((total, current) => {
        if (current.initiatorType === 'img') {
          total.img_count = total.img_count ? total.img_count + 1 : 1;
        } else if (current.initiatorType === 'script') {
          total.js_count = total.js_count ? total.js_count + 1 : 1;
        } else if (current.initiatorType === 'link') {
          if (current.name.endsWith('.css')) {
            total.css_count = total.css_count ? total.css_count + 1 : 1;
          }
        }
        return total;
      }, {});
      Object.assign(this.performanceTiming.entries, obj);
    }
  }

  send() {
    logger.sendPerformance(this.performanceTiming);
  }
}

export default PerformanceMonitor;