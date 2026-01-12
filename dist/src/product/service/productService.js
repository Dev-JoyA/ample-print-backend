import { Product } from "../model/productModel.js";
import { Collection } from "../model/collectionModel.js";
import { ProductStatus, } from "../model/productInterface.js";
export async function createCollection(name) {
    const existing = await Collection.findOne({ name });
    if (existing)
        throw new Error("Collection already exists");
    return await Collection.create({ name });
}
export async function updateCollection(id, name) {
    const updated = await Collection.findById(id);
    if (!updated)
        throw new Error("Collection does not exist");
    const nameExists = await Collection.findOne({ name });
    if (nameExists)
        throw new Error("Collection name already exist");
    updated.name = name;
    await updated.save();
    return updated;
}
export async function deleteCollection(id) {
    const deleted = await Collection.findByIdAndDelete(id);
    if (!deleted)
        throw new Error("Collection not found");
    return "Collection successfully deleted";
}
export async function getCollectionById(id) {
    const collection = await Collection.findById(id);
    if (!collection)
        throw new Error("Collection not found");
    return collection;
}
export async function getAllCollections() {
    return await Collection.find();
}
export async function searchCollections(search) {
    if (!search)
        return [];
    return await Collection.find({
        name: { $regex: `.*${search}.*`, $options: "i" },
    });
}
export async function getCollectionsPaginated(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [collections, total] = await Promise.all([
        Collection.find().skip(skip).limit(limit).sort({ createdAt: -1 }),
        Collection.countDocuments(),
    ]);
    return { collections, total, page, limit };
}
// -------------------- PRODUCT SERVICES -------------------- //
export async function createProduct(collectionId, data) {
    const collection = await Collection.findById(collectionId);
    if (!collection)
        throw new Error("Collection not found");
    const existingProduct = await Product.findOne({ name: data.name });
    if (existingProduct)
        throw new Error("Product with that name already exists");
    if (!data.name || !data.price || !data.image)
        throw new Error("Missing required fields");
    const newProduct = await Product.create({
        collectionId: collection._id,
        name: data.name,
        description: data.description,
        price: data.price,
        dimension: {
            width: data.dimension.width,
            height: data.dimension.height,
        },
        minOrder: data.minOrder,
        image: data.image,
        filename: data.filename,
        images: data.images || [],
        filenames: data.filenames || [],
        material: data.material,
        deliveryDay: data.deliveryDay,
        status: ProductStatus.Active,
    });
    return newProduct;
}
export async function updateProduct(id, data) {
    const updated = await Product.findByIdAndUpdate(id, { ...data }, { new: true, runValidators: true });
    if (!updated)
        throw new Error("Product not found");
    return updated;
}
export async function deleteProduct(id) {
    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted)
        throw new Error("Product not found");
    return "Product successfully deleted";
}
export async function getProductById(id) {
    const product = await Product.findById(id).populate("collectionId", "name");
    if (!product)
        throw new Error("Product not found");
    return product;
}
export async function getAllProducts() {
    return await Product.find().populate("collectionId", "name");
}
export async function searchProducts(search) {
    if (!search)
        return [];
    return await Product.find({
        name: { $regex: `.*${search}.*`, $options: "i" },
    }).populate("collectionId", "name");
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
    const skip = (page - 1) * limit;
    const query = { name: { $regex: `.*${search}.*`, $options: "i" } };
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