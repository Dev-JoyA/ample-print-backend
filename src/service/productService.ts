import  { Product } from "../models/productModel.js";
import  { Collection }  from "../models/collectionModel.js";
import {ICollection, 
    IProduct,
    ProductStatus ,
    ProductData,
    ProductFilter,
    PaginatedCollections,
    CollectionWithProducts} from "../models/productInterface.js"



export async function createCollection(name: string): Promise<ICollection> {
  const existing = await Collection.findOne({ name });
  if (existing) throw new Error("Collection already exists");

  return await Collection.create({ name });
}

export async function updateCollection(id: string, name: string): Promise<ICollection> {
  const updated = await Collection.findById(id);
  
  if (!updated) throw new Error("Collection does not exist");

  const nameExists = await Collection.findOne({ name });

  if (nameExists) throw new Error("Collection name already exist");

  updated.name = name;
  await updated.save();

  return updated;
}

export async function deleteCollection(id: string): Promise<string> {
  const deleted = await Collection.findByIdAndDelete(id);
  if (!deleted) throw new Error("Collection not found");

  return "Collection successfully deleted";
}

export async function getCollectionById(id: string): Promise<ICollection> {
  const collection = await Collection.findById(id);
  if (!collection) throw new Error("Collection not found");

  return collection;
}

export async function getAllCollections(): Promise<ICollection[]> {
  return await Collection.find();
}

export async function searchCollections(search: string): Promise<ICollection[]> {
  if (!search) return [];
  return await Collection.find({ name: { $regex: `.*${search}.*`, $options: "i" } });
}

export async function getCollectionsPaginated(page: number = 1, limit: number = 10): Promise<PaginatedCollections> {
  const skip = (page - 1) * limit;
  const [collections, total] = await Promise.all([
    Collection.find().skip(skip).limit(limit).sort({ createdAt: -1 }),
    Collection.countDocuments(),
  ]);

  return { collections, total, page, limit };
}

export interface PaginatedProducts {
  products: IProduct[];
  total: number;
  page: number;
  limit: number;
}

// -------------------- PRODUCT SERVICES -------------------- //

export async function createProduct(collectionId: string, data: ProductData): Promise<IProduct> {
  const collection = await Collection.findById(collectionId);
  if (!collection) throw new Error("Collection not found");

  const existingProduct = await Product.findOne({ name: data.name });
  if (existingProduct) throw new Error("Product with that name already exists");

  if (!data.name || !data.price || !data.image) throw new Error("Missing required fields");

  const newProduct = await Product.create({
    collectionId: collection._id,
    name: data.name,
    description: data.description,
    price: data.price,
    dimension: {
        width: data.dimension.width,
        height: data.dimension.height
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

export async function updateProduct(id: string, data: Partial<ProductData>): Promise<IProduct> {
  const updated = await Product.findByIdAndUpdate(
    id,
    { ...data },
    { new: true, runValidators: true }
  );
  if (!updated) throw new Error("Product not found");

  return updated;
}

export async function deleteProduct(id: string): Promise<string> {
  const deleted = await Product.findByIdAndDelete(id);
  if (!deleted) throw new Error("Product not found");

  return "Product successfully deleted";
}

export async function getProductById(id: string): Promise<IProduct> {
  const product = await Product.findById(id).populate("collectionId", "name");
  if (!product) throw new Error("Product not found");

  return product;
}

export async function getAllProducts(): Promise<IProduct[]> {
  return await Product.find().populate("collectionId", "name");
}

export async function searchProducts(search: string): Promise<IProduct[]> {
  if (!search) return [];
  return await Product.find({
    name: { $regex: `.*${search}.*`, $options: "i" },
  }).populate("collectionId", "name");
}


export async function getProductsPaginated(page: number = 1, limit: number = 10): Promise<PaginatedProducts> {
  const skip = (page - 1) * limit;
  const [products, total] = await Promise.all([
    Product.find().skip(skip).limit(limit).sort({ createdAt: -1 }).populate("collectionId", "name"),
    Product.countDocuments(),
  ]);

  return { products, total, page, limit };
}

export async function filterProducts(filter: ProductFilter, page: number = 1, limit: number = 10): Promise<PaginatedProducts> {
  const query: any = {};

  if (filter.priceMin !== undefined) query.price = { ...query.price, $gte: filter.priceMin };
  if (filter.priceMax !== undefined) query.price = { ...query.price, $lte: filter.priceMax };
  if (filter.status) query.status = filter.status;
  if (filter.collectionId) query.collectionId = filter.collectionId;

  const skip = (page - 1) * limit;
  const [products, total] = await Promise.all([
    Product.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).populate("collectionId", "name"),
    Product.countDocuments(query),
  ]);

  return { products, total, page, limit };
}

export async function getProductsByCollectionId(collectionId: string): Promise<IProduct[]> {
  const collection = await Collection.findById(collectionId);
  if (!collection) throw new Error("Collection not found");

  return await Product.find({ collectionId }).sort({ createdAt: -1 }).populate("collectionId", "name");
}


export async function searchProductsByName(search: string, page: number = 1, limit: number = 10): Promise<PaginatedProducts> {
  if (!search) return { products: [], total: 0, page, limit };

  const skip = (page - 1) * limit;
  const query = { name: { $regex: `.*${search}.*`, $options: "i" } };

  const [products, total] = await Promise.all([
    Product.find(query).skip(skip).limit(limit).populate("collectionId", "name"),
    Product.countDocuments(query),
  ]);

  return { products, total, page, limit };
}

