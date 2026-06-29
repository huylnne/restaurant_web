import { ref, onUnmounted } from "vue";
import axios from "axios";
import { API_ORIGIN } from "@/config/api";
import { createQrDataUrl } from "../utils/tableLinkQr";

const DEFAULT_POLL_INTERVAL_MS = 3000;

export function useVietQrPayment(options = {}) {
  const apiOrigin = options.apiOrigin ?? API_ORIGIN;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;

  const qrDataUrl = ref("");
  const vietqrRaw = ref("");
  const amount = ref(0);
  const paymentCode = ref("");
  const orderId = ref(null);
  const status = ref("");
  const loading = ref(false);

  let pollTimer = null;

  function reset() {
    qrDataUrl.value = "";
    vietqrRaw.value = "";
    amount.value = 0;
    paymentCode.value = "";
    orderId.value = null;
    status.value = "";
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  async function pollStatus(onSucceeded) {
    if (!orderId.value) return;
    try {
      const res = await axios.get(`${apiOrigin}/api/payments/by-order/${orderId.value}`);
      status.value = res.data?.status || "";
      if (status.value === "succeeded") {
        stopPolling();
        if (typeof onSucceeded === "function") {
          await onSucceeded(orderId.value);
        }
      }
    } catch (err) {
      console.error("Poll payment status error:", err);
    }
  }

  function startPolling(onSucceeded) {
    stopPolling();
    pollStatus(onSucceeded);
    pollTimer = setInterval(() => pollStatus(onSucceeded), pollIntervalMs);
  }

  async function createPaymentQr(tableToken, { onSucceeded, autoPoll = true } = {}) {
    loading.value = true;
    reset();
    stopPolling();
    try {
      const res = await axios.post(`${apiOrigin}/api/payments/vietqr`, { tableToken });
      const raw = res.data?.vietqrRaw;
      vietqrRaw.value = raw || "";
      amount.value = res.data?.amount || 0;
      paymentCode.value = res.data?.vietqrContent || res.data?.paymentCode || "";
      orderId.value = res.data?.orderId || null;
      if (!raw) throw new Error("NO_QR");
      qrDataUrl.value = await createQrDataUrl(raw);
      if (autoPoll) startPolling(onSucceeded);
      return res.data;
    } finally {
      loading.value = false;
    }
  }

  onUnmounted(stopPolling);

  return {
    qrDataUrl,
    vietqrRaw,
    amount,
    paymentCode,
    orderId,
    status,
    loading,
    reset,
    createPaymentQr,
    startPolling,
    stopPolling,
  };
}
