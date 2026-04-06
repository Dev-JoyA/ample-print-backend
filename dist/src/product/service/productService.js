import mongoose from "mongoose";
import { Product } from "../model/productModel.js";
import { Collection } from "../model/collectionModel.js";
import { ProductStatus, } from "../model/productInterface.js";
// ==================== COLLECTION SERVICES ====================
export async function createCollection(name) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const existing = await Collection.findOne({ name }).session(session);
        if (existing) {
            await session.abortTransaction();
            session.endSession();
            throw new Error("Collection already exists");
        }
        const [collection] = await Collection.create([{ name }], { session });
        await session.commitTransaction();
        session.endSession();
        return collection;
    }
    catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
}
export async function updateCollection(id, name) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const collection = await Collection.findById(id).session(session);
        if (!collection) {
            await session.abortTransaction();
            session.endSession();
            throw new Error("Collection does not exist");
        }
        const nameExists = await Collection.findOne({
            name,
            _id: { $ne: id }
        }).session(session);
        if (nameExists) {
            await session.abortTransaction();
            session.endSession();
            throw new Error("Collection name already exists");
        }
        collection.name = name;
        await collection.save({ session });
        await session.commitTransaction();
        session.endSession();
        return collection;
    }
    catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
}
export async function deleteCollection(id) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        // Check if collection has any products
        const productsCount = await Product.countDocuments({ collectionId: id }).session(session);
        if (productsCount > 0) {
            await session.abortTransaction();
            session.endSession();
            throw new Error("Cannot delete collection that has products. Delete the products first.");
        }
        const deleted = await Collection.findByIdAndDelete(id).session(session);
        if (!deleted) {
            await session.abortTransaction();
            session.endSession();
            throw new Error("Collection not found");
        }
        await session.commitTransaction();
        session.endSession();
        return "Collection successfully deleted";
    }
    catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
}
export async function getCollectionById(id) {
    const collection = await Collection.findById(id);
    if (!collection)
        throw new Error("Collection not found");
    return collection;
}
export async function getAllCollections() {
    return await Collection.find().sort({ createdAt: -1 });
}
export async function searchCollections(search) {
    if (!search)
        return [];
    return await Collection.find({
        name: { $regex: `.*${search}.*`, $options: "i" },
    }).sort({ createdAt: -1 });
}
export async function getCollectionsPaginated(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [collections, total] = await Promise.all([
        Collection.find().skip(skip).limit(limit).sort({ createdAt: -1 }),
        Collection.countDocuments(),
    ]);
    return { collections, total, page, limit };
}
// ==================== PRODUCT SERVICES ====================
export async function createProduct(collectionId, data) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const collection = await Collection.findById(collectionId).session(session);
        if (!collection) {
            await session.abortTransaction();
            session.endSession();
            throw new Error("Collection not found");
        }
        const existingProduct = await Product.findOne({ name: data.name }).session(session);
        if (existingProduct) {
            await session.abortTransaction();
            session.endSession();
            throw new Error("Product with that name already exists");
        }
        if (!data.name || !data.price || !data.image) {
            await session.abortTransaction();
            session.endSession();
            throw new Error("Missing required fields");
        }
        const [product] = await Product.create([{
                collectionId: collection._id,
                name: data.name,
                description: data.description || "",
                price: data.price,
                dimension: {
                    width: data.dimension?.width || null,
                    height: data.dimension?.height || null,
                },
                minOrder: data.minOrder,
                image: data.image,
                filename: data.filename,
                images: data.images || [],
                filenames: data.filenames || [],
                material: data.material,
                deliveryDay: data.deliveryDay,
                status: ProductStatus.Active,
            }], { session });
        await session.commitTransaction();
        session.endSession();
        return product;
    }
    catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
}
export async function updateProduct(id, data) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        // If name is being updated, check for duplicates
        if (data.name) {
            const existingProduct = await Product.findOne({
                name: data.name,
                _id: { $ne: id }
            }).session(session);
            if (existingProduct) {
                await session.abortTransaction();
                session.endSession();
                throw new Error("Product with that name already exists");
            }
        }
        const updated = await Product.findByIdAndUpdate(id, data, { new: true, runValidators: true, session });
        if (!updated) {
            await session.abortTransaction();
            session.endSession();
            throw new Error("Product not found");
        }
        await session.commitTransaction();
        session.endSession();
        return updated;
    }
    catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
}
export async function deleteProduct(id) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        // Check if product is used in any orders (optional - depends on your business logic)
        // You might want to check Order collection here
        const deleted = await Product.findByIdAndDelete(id).session(session);
        if (!deleted) {
            await session.abortTransaction();
            session.endSession();
            throw new Error("Product not found");
        }
        await session.commitTransaction();
        session.endSession();
        return "Product successfully deleted";
    }
    catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
}
export async function getProductById(id) {
    const product = await Product.findById(id).populate("collectionId", "name");
    if (!product)
        throw new Error("Product not found");
    return product;
}
export async function getAllProducts() {
    return await Product.find()
        .populate("collectionId", "name")
        .sort({ createdAt: -1 });
}
export async function searchProducts(search) {
    if (!search)
        return [];
    return await Product.find({
        name: { $regex: `.*${search}.*`, $options: "i" },
    })
        .populate("collectionId", "name")
        .sort({ createdAt: -1 });
}
export async function getProductsPaginated(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
        Product.find()
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
            .populate("collectionId", "name"),
        Product.countDocuments(),
    ]);
    return { products, total, page, limit };
}
export async function filterProducts(filter, page = 1, limit = 10) {
    const query = {};
    if (filter.priceMin !== undefined)
        query.price = { ...query.price, $gte: filter.priceMin };
    if (filter.priceMax !== undefined)
        query.price = { ...query.price, $lte: filter.priceMax };
    if (filter.status)
        query.status = filter.status;
    if (filter.collectionId)
        query.collectionId = filter.collectionId;
    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
        Product.find(query)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
            .populate("collectionId", "name"),
        Product.countDocuments(query),
    ]);
    return { products, total, page, limit };
}
export async function getProductsByCollectionId(collectionId) {
    const collection = await Collection.findById(collectionId);
    if (!collection)
        throw new Error("Collection not found");
    return await Product.find({ collectionId })
        .sort({ createdAt: -1 })
        .populate("collectionId", "name");
}
export async function searchProductsByName(search, page = 1, limit = 10) {
    if (!search)
        return { products: [], total: 0, page, limit };
    const sanitized = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const skip = (page - 1) * limit;
    const query = { name: { $regex: sanitized, $options: "i" } };
    const [products, total] = await Promise.all([
        Product.find(query)
            .skip(skip)
            .limit(limit)
            .populate("collectionId", "name"),
        Product.countDocuments(query),
    ]);
    return { products, total, page, limit };
}
//# sourceMappingURL=productService.js.map