import { idbGetAll, idbPut, idbDelete } from './idb';
import { PRODUCTS } from '../data/products';

// Queue item shape: { id?, type: 'add'|'update'|'remove'|'checkout', payload: any, ts: number }

export async function enqueueAction(action) {
  const withTs = { ...action, ts: Date.now() };
  await idbPut('queue', withTs);
}

export async function getQueuedActions() {
  return idbGetAll('queue');
}

export async function clearAction(id) {
  await idbDelete('queue', id);
}

export function reconcileCartAgainstCatalog(cartItems) {
  // Adjust quantities to available stock and refresh prices from catalog
  const productMap = new Map(PRODUCTS.map(p => [p.id, p]));
  return cartItems.map(item => {
    const p = productMap.get(item.id);
    if (!p) return item; // unknown product, keep as-is
    const quantity = Math.min(item.quantity, p.stock);
    return { ...item, price: p.price, discount: p.discount, quantity };
  });
}

export async function replayQueueOnline() {
  const actions = await getQueuedActions();
  for (const action of actions) {
    try {
      if (action.type === 'checkout') {
        await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.payload),
        });
      }
      // Add/Update/Remove would hit your API in a real app
      await clearAction(action.id);
    } catch (_) {
      // stop processing on first failure; background sync may retry
      break;
    }
  }
}