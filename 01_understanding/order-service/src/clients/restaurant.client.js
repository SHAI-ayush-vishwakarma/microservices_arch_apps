// All communication with the Restaurant Service lives in this file.

// A custom error type so the route can recognise "restaurant is unavailable"
export class RestaurantUnavailableError extends Error {}

export async function getDish(dishId, requestId) {
  const url = `${process.env.RESTAURANT_SERVICE_URL}/menu/${dishId}`;
  const timeoutMs = Number(process.env.RESTAURANT_TIMEOUT_MS) || 3000;

  let response;
  try {
    response = await fetch(url, {
      headers: { "x-request-id": requestId },               // ← 2. send it as a header
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    console.error(`[order-service] [${requestId}] Could not reach restaurant service: ${error.message}`);  // ← 3. log it
    throw new RestaurantUnavailableError("Restaurant service unavailable");
  }

  if (response.status === 404) {
    return null; // dish doesn't exist
  }

  if (!response.ok) {
    // restaurant service itself failed (e.g. 500)
    console.error(`[order-service] Restaurant service returned ${response.status}`);
    throw new RestaurantUnavailableError("Restaurant service unavailable");
  }

  const body = await response.json();
  return body.data; // { id, name, price, isAvailable }
}
