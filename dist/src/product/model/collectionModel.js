import { Schema, model } from "mongoose";
const CollectionSchema = new Schema({
    name: {
        type: String,
        required: true,
        index: true,
    },
}, {
    timestamps: true,
});
export const Collection = model("Collection", CollectionSchema);
//# sourceMappingURL=collectionModel.js.map