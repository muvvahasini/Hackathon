import React, { useEffect, useState, useRef } from "react";

const PayPalCheckout = ({
  amount,
  onSuccess,
  onError,
  orderData,
  onProcessing,
  currency = "USD",
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const paypalRef = useRef();

  useEffect(() => {
    let isMounted = true;

    const loadPayPalSDK = async () => {
      try {
        // ✅ Step 1: Fetch client ID from backend
        const res = await fetch("http://localhost:5000/api/paypal/client-id");
        const data = await res.json();
        const clientId = data.clientId;

        if (!clientId) throw new Error("Missing PayPal Client ID");

        // ✅ Step 2: Check if SDK already exists
        if (document.getElementById("paypal-sdk")) {
          setSdkReady(true);
          return;
        }

        // ✅ Step 3: Inject PayPal SDK script
        const script = document.createElement("script");
        script.id = "paypal-sdk";
        script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}`;
        script.async = true;
        script.onload = () => isMounted && setSdkReady(true);
        script.onerror = () => {
          console.error(" Failed to load PayPal SDK");
          onError?.(new Error("Failed to load PayPal SDK"));
        };
        document.body.appendChild(script);
      } catch (error) {
        console.error(" Error loading PayPal SDK:", error);
        onError?.(error);
      }
    };

    loadPayPalSDK();

    return () => {
      isMounted = false;
    };
  }, [currency, onError]);

  useEffect(() => {
    let isMounted = true;

    const renderPayPal = async () => {
      if (!sdkReady || !paypalRef.current || !window.paypal) return;

      paypalRef.current.innerHTML = "";

      try {
        await window.paypal.Buttons({
          createOrder: async () => {
            setIsProcessing(true);
            onProcessing?.(true);

            const res = await fetch("http://localhost:5000/api/paypal/create-order", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
              body: JSON.stringify({ amount, orderData }),
            });

            if (!res.ok) throw new Error("Failed to create PayPal order");

            const data = await res.json();
            return data.orderID;
          },
          onApprove: async (data) => {
            const res = await fetch(
              `http://localhost:5000/api/paypal/capture-order/${data.orderID}`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
              }
            );

            if (!res.ok) throw new Error("Failed to capture PayPal order");

            const orderDetails = await res.json();
            setIsProcessing(false);
            onProcessing?.(false);
            onSuccess?.(orderDetails);
          },
          onError: (err) => {
            console.error("❌ PayPal Error:", err);
            setIsProcessing(false);
            onProcessing?.(false);
            onError?.(err);
          },
          onCancel: () => {
            setIsProcessing(false);
            onProcessing?.(false);
            onError?.(new Error("Payment cancelled"));
          },
        }).render(paypalRef.current);
      } catch (error) {
        if (isMounted) {
          console.error("❌ Failed to render PayPal buttons:", error);
          onError?.(error);
        }
      }
    };

    renderPayPal();

    return () => {
      isMounted = false;
    };
  }, [sdkReady, amount, orderData, onSuccess, onError, onProcessing]);

  return (
    <div>
      <div ref={paypalRef} id="paypal-button-container" />
      {!sdkReady && <p>Loading PayPal SDK...</p>}
      {isProcessing && (
        <div className="payment-processing">
          <div className="processing-spinner"></div>
          <p>Processing your payment...</p>
        </div>
      )}
    </div>
  );
};

export default PayPalCheckout;
