import { Schema, model } from "mongoose";
import { ProductStatus } from "./productInterface.js";
const ProductSchema = new Schema({
    collectionId: {
        type: Schema.Types.ObjectId,
        ref: "Collection",
        index: true,
        required: true,
    },
    name: {
        type: String,
        unique: true,
        index: true,
        required: true,
    },
    description: {
        type: String,
        index: true,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    dimension: {
        width: {
            type: String,
            required: true,
        },
        height: {
            type: String,
            required: true,
        },
    },
    minOrder: {
        type: Number,
        required: true,
    },
    image: {
        type: String,
        required: true,
    },
    filename: {
        type: String,
        required: true,
    },
    images: {
        type: [String],
        default: [],
    },
    filenames: {
        type: [String],
        default: [],
    },
    material: {
        type: String,
    },
    status: {
        type: String,
        enum: Object.values(ProductStatus),
        index: true,
        default: ProductStatus.Active,
    },
    deliveryDay: {
        type: String,
        required: true,
    },
}, {
    timestamps: true,
});
export const Product = model("Product", ProductSchema);
//# sourceMappingURL=productModel.js.map