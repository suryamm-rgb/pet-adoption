import mongoose from "mongoose";

const { Schema, model, Types } = mongoose;
export { Schema, model };
export const id = (ref) => ({ type: Types.ObjectId, ref });
export const opts = { timestamps: true };
