import express from 'express';
import  Collection  from '../models/collectionModel.js';
import Product from '../models/productModel.js';
import { checkRole } from '../middleware/authorization.js';

const createCollection = [
    checkRole(["admin"]),
    async (req, res) => {
        try{
            const { collectionName } = req.body;
            const user = req.user;
            if (user.role !== "admin" ){
                return res.status(500).json({message : "Only Admin can create a collection"});
            }

            const existingCollection = await Collection.findOne({ where: { collectionName } });
            if (existingCollection) {
                return res.status(409).json({ message: "Collection already exists" });
            }
            
            const newCollection = await Collection.createCollection({collectionName});
            return res.status(201).json({ message: "Collection created successfully", newCollection });
        }catch (error) {
            console.error("Error creating collection:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }
]

const updateCollection = [
    checkRole(["admin"]),
    async(req, res) => {
        try{
            const { collectionId } = req.params;
            const { collectionName } = req.body;
            const user = req.user;

            if (user.role !== "admin") {
                return res.status(403).json({ message: "Only Admin can update a collection" });
            }

            const existingCollection = await Collection.findByPk(collectionId);
            if (!existingCollection) {
                return res.status(404).json({ message: "Collection not found" });
            }

            existingCollection.collectionName = collectionName;
            await existingCollection.save();

            return res.status(200).json({ message: "Collection updated successfully", existingCollection });

        }catch (error) {
            console.error("Error updating collection:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }
]

const deleteCollection = [
    checkRole(["admin"]),
    async (req, res) => {
        try {
            const { collectionId } = req.params;
            const user = req.user;

            if (user.role !== "admin"){
                return res.status(403).json({ message: "Only Admin can delete a collection" });
            }

            const existing = Collection.findByPk(collectionId);
            if (!existing) {
                return res.status(404).json({ message: "Collection not found" });
            }
            // Check if there are products associated with the collection
            const products = await Product.findAll({ where: { collectionId } });
            if (products.length > 0) {
                return res.status(400).json({ message: "Cannot delete collection with associated products" });
            }
            await existing.destroy();
            return res.status(200).json({ message: "Collection deleted successfully" }); 

        }catch (error) {
            console.error("Error deleting collection:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }
]

const getAllCollections = [
    checkRole(["admin", "customer"]),
    async (req, res) => {
        try {
            const collections = await Collection.findAll();
            return res.status(200).json({ message: "Collections retrieved successfully", collections });
        } catch (error) {
            console.error("Error retrieving collections:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }
]
const getCollectionById = [
    checkRole(["admin", "customer"]),
    async (req, res) => {
        try {
            const { collectionId } = req.params;
            const collection = await Collection.findByPk(collectionId);
            if (!collection) {
                return res.status(404).json({ message: "Collection not found" });
            }
            return res.status(200).json({ message: "Collection retrieved successfully", collection });
        } catch (error) {
            console.error("Error retrieving collection:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }
]   

const createProduct = [
    checkRole(["admin"]),
    async (req, res) => {
        try{
            const { collection_Id, 
                product_name,
                product_description,
                product_price,
                product_image,
                dimension,
                min_order,
                delivery_time
            } = req.body;
            const user = req.user;
            if (user.role !== "admin") {
                return res.status(403).json({ message: "Only Admin can create a product" });
            }
            const existingProduct = await Product.findOne({ where: { product_name } });
            if (existingProduct) {
                return res.status(409).json({ message: "Product already exists" });
            }
            const newProduct = await Product.create({
                collection_Id,
                product_name,
                product_description,
                product_price,
                product_image,
                dimension,
                min_order,
                delivery_time
            });
            return res.status(201).json({ message: "Product created successfully", newProduct });
        }catch (error) {
            console.error("Error creating product:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }
]

    const updateProduct = [ 
        checkRole(["admin"]),
        async (req, res) => {
            try{
                const { productId } = req.params;
                const { collection_Id, 
                    product_name,
                    product_description,
                    product_price,
                    product_image,
                    dimension,
                    min_order,
                    delivery_time
                } = req.body;
                const user = req.user;
                if (user.role !== "admin") {
                    return res.status(403).json({ message: "Only Admin can update a product" });
                }
                const existingProduct = await Product.findByPk(productId);
                if (!existingProduct) {
                    return res.status(404).json({ message: "Product not found" });
                }
                existingProduct.collection_Id = collection_Id;
                existingProduct.product_name = product_name;
                existingProduct.product_description = product_description;
                existingProduct.product_price = product_price;
                existingProduct.product_image = product_image;
                existingProduct.dimension = dimension;
                existingProduct.min_order = min_order;
                existingProduct.delivery_time = delivery_time;

                await existingProduct.save();
                
                return res.status(200).json({ message: "Product updated successfully", existingProduct });
            }catch (error) {
                console.error("Error updating product:", error);
                return res.status(500).json({ message: "Internal server error" });
            }
        }
    ]
const deleteProduct = [ 
    checkRole(["admin"]),
    async (req, res) => {
        try {
            const { productId } = req.params;
            const user = req.user;
            if (user.role !== "admin") {
                return res.status(403).json({ message: "Only Admin can delete a product" });
            }
            const existingProduct = await Product.findByPk(productId);
            if (!existingProduct) {
                return res.status(404).json({ message: "Product not found" });
            }
            await existingProduct.destroy();
            return res.status(200).json({ message: "Product deleted successfully" });
        }catch (error) {
            console.error("Error deleting product:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }
]

const getAllProducts = [
    checkRole(["admin", "customer"]),
    async (req, res) => {
        try {
            const products = await Product.findAll();
            return res.status(200).json({ message: "Products retrieved successfully", products });
        } catch (error) {
            console.error("Error retrieving products:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }
]

const getProductById = [
    checkRole(["admin", "customer"]),
    async (req, res) => {
        try {
            const { productId } = req.params;
            const product = await Product.findByPk(productId);
            if (!product) {
                return res.status(404).json({ message: "Product not found" });
            }
            return res.status(200).json({ message: "Product retrieved successfully", product });
        } catch (error) {
            console.error("Error retrieving product:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }
]

export {
    createCollection,
    updateCollection,
    deleteCollection,
    getAllCollections,
    getCollectionById,
    createProduct,
    updateProduct,
    deleteProduct,  
    getAllProducts,
    getProductById
}