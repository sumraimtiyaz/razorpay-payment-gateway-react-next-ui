"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";


interface Product {
    name: string;
    price: number;
    quantity?: number;
}

const PaymentPage = () => {
    
    const [cart, setCart] = useState<Product[]>([]);
    const [customerName, setCustomerName] = useState("");
    
    // Calculate total using useMemo to optimize performance
    const totalAmount = useMemo(() => {
        return cart.reduce((total, item) => total + item.price * (item.quantity || 1), 0);
    }, [cart]);

    // Load Razorpay SDK only once
    useEffect(() => {
        const scriptId = "razorpay-sdk";
        if (document.getElementById(scriptId)) return;

        const script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        script.onload = () => console.log("Razorpay SDK Loaded");
        script.onerror = () => console.error("Failed to load Razorpay SDK");
        document.body.appendChild(script);
    }, []);

    const addToCart = (product: Product) => {
        setCart((prevCart) => {
            const existingProduct = prevCart.find((item) => item.name === product.name);
            return existingProduct
            ? prevCart.map((item) =>
            item.name === product.name ? { ...item, quantity: (item.quantity || 1) + 1 } : item
            )
            : [...prevCart, { ...product, quantity: 1 }];
        });
    };
    
    const removeFromCart = (productName: string) => {
        setCart((prevCart) =>
        prevCart
        .map((item) =>
        item.name === productName ? { ...item, quantity: (item.quantity || 1) - 1 } : item
        )
        .filter((item) => item.quantity && item.quantity > 0)
        );
    };
    const createOrder = async () => {
        try {
            
            const { data } = await axios.post("https://localhost:7184/api/payments/CreateOrder", {
                amount: totalAmount,
            });
            return data;
        } catch (error) {
            console.error("Error creating order:", error);
            alert("Failed to initiate payment. Please try again.");
            return null;
        }
    };

    const capturePayment = async (response: any) => {
        try {
            const verifyResponse = await axios.post("https://localhost:7184/api/payments/CapturePayment", {
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                signature: response.razorpay_signature,
            });
            alert("Payment Successful!");
            setCart([]);
            setCustomerName("");
        } catch (error) {
            console.error("Error capturing payment:", error);
            alert("Payment verification failed. Contact support.");
        }
    };

    const handleRazorpay = (order: any) => {
        if (!window || !(window as any).Razorpay) {
            alert("Razorpay SDK not loaded. Please check your internet connection.");
            return;
        }

        const options = {
            key: order.razorpayKey,
            amount: order.amount * 100,
            currency: "INR",
            name: customerName,
            order_id: order.orderId,
            handler: capturePayment,
            theme: { color: "#F37254" },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
    };

    const handleCheckout = async () => {
        if (!cart.length) {
            alert("Cart is empty. Add products before checkout.");
            return;
        }
        if (!customerName.trim()) {
            alert("Please enter your name before proceeding.");
            return;
        }

        const order = await createOrder();
        if (order) handleRazorpay(order);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
            <h2 className="text-2xl font-bold mb-4">🛍️ Product List</h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
                {[{ name: "Product A", price: 500 }, { name: "Product B", price: 700 }].map((product) => (
                    <div key={product.name} className="p-4 bg-white shadow-lg rounded-lg w-48 flex flex-col items-center">
                        <span className="font-semibold">{product.name}</span>
                        <span className="text-gray-600">₹{product.price}</span>
                        <button onClick={() => addToCart(product)} className="mt-2 px-3 py-1 bg-blue-500 text-white rounded">
                            ➕ Add
                        </button>
                    </div>
                ))}
            </div>

            <div className="p-6 bg-white shadow-lg rounded-lg w-96">
                <h3 className="text-xl font-semibold mb-2">🛒 Your Cart</h3>
                {cart.length > 0 ? (
                    <ul className="mb-4">
                        {cart.map((item, index) => (
                            <li key={index} className="border-b p-2 flex justify-between items-center">
                                <span>
                                    {item.name} - ₹{item.price} x {item.quantity}
                                </span>
                                <div className="flex items-center">
                                    <button onClick={() => removeFromCart(item.name)} className="px-2 py-1 bg-red-500 text-white rounded">
                                        ➖
                                    </button>
                                    <button onClick={() => addToCart(item)} className="ml-2 px-2 py-1 bg-green-500 text-white rounded">
                                        ➕
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500">Cart is empty.</p>
                )}

                <h3 className="text-lg font-bold mb-4">Total: ₹{totalAmount}</h3>

                <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter Your Name"
                    className="w-full p-2 border rounded mb-4"
                />

                <button onClick={handleCheckout} className="w-full p-2 bg-blue-600 text-white rounded disabled:opacity-50" disabled={!cart.length}>
                    Checkout & Pay
                </button>
            </div>
        </div>
    );
};

export default PaymentPage;
