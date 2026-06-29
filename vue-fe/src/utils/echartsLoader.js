let echartsModule = null;

/** Lazy-load ECharts — chỉ tải khi vào trang báo cáo. */
export async function loadEcharts() {
  if (!echartsModule) {
    echartsModule = await import("echarts");
  }
  return echartsModule;
}
