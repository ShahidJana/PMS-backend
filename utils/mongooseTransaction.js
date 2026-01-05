import mongoose from 'mongoose';

export async function withTransaction(fn, options = {}) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    }, options);
    return result;
  } finally {
    session.endSession();
  }
}
