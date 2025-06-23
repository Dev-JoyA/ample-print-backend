import express from 'express';
import  Collection  from '../models/collectionModel.js';
import upload from  "../config/upload.js";
import Product from '../models/productModel.js';
import { checkRole } from '../middleware/authorization.js';
import { authenticateToken } from '../utils/auth.js';
import {Op} from "sequelize"

export const createCollection = [
    authenticateToken,
    checkRole(["admin"]),
    async (req, res) => {
        try{
            const { collection_name } = req.body;
            
            const existingCollection = await Collection.findOne({ where : {collection_name}});
            if (existingCollection) {
                return res.status(409).json({ message: "Collection already exists" });
            }
            
            const newCollection = await Collection.create({
                collection_name 
            });

            newCollection.save()

            return res.status(201).json({ message: "Collection created successfully", newCollection });
        }catch (error) {
            console.error("Error creating collection:", error);
            return res.status(500).json({ message: "Error creating collection" });
        }
    }
]

export const updateCollection = [
    authenticateToken,
    checkRole(["admin"]),
    async(req, res) => {
        try{
            const { collection_id } = req.params;
            const { collection_name } = req.body;

            const existingCollection = await Collection.findByPk(collection_id);
            if (!existingCollection) {
                return res.status(404).json({ message: "Collection not found" });
            }

            existingCollection.collection_name = collection_name;
            await existingCollection.save();

            return res.status(200).json({ message: "Collection updated successfully", existingCollection });

        }catch (error) {
            console.error("Error updating collection:", error);
            return res.status(500).json({ message: "Error updating collection" });
        }
    }
]

export const deleteCollection = [
    authenticateToken,
    checkRole(["admin"]),
    async (req, res) => {
      try {
        const { collection_id } = req.params;
  
        const existing = Collection.findByPk(collection_id);
        if (!existing) {
          return res.status(404).json({ message: "Collection not found" });
        }

        if (!collection_id) {
            return res.status(400).json({ error: 'Collection ID is required' });
          }
  
        const products = await Product.findAll({ where: { collection_id } });
        if (products.length > 0) {
            return res.status(400).json({ message: "Cannot delete collection with associated products" });
        }
  
        await Collection.destroy({ where: { collection_id } });
        return res.status(200).json({ message: "Collection deleted successfully" });
      } catch (error) {
        console.error("Error deleting collection:", error);
        return res.status(500).json({ message: "Error deleting collection" });
      }
    }
  ];

export const getAllCollections = [
    async (req, res) => {
        try {
            const collections = await Collection.findAll();
            return res.status(200).json({ message: "Collections retrieved successfully", collections});
        } catch (error) {
            console.error("Error retrieving collections:", error);
            return res.status(500).json({ message: "Error retrieving collections" });
        }
    }
]
export const getCollectionById = [
    async (req, res) => {
        try {
            const { collectionId } = req.params;
            const collection = await Collection.findByPk(collectionId);
            if (!collection) {
                return res.status(404).json({ message: `Collection with id ${collectionId} not found` });
            }
            return res.status(200).json({ message: "Collection retrieved successfully", collection });
        } catch (error) {
            console.error("Error retrieving collection:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }
]   

export const findByCollectionName = async(req, res) => {
    try{
        const { collection_name } = req.query;
        if (!collection_name) {
            return res.status(400).json({ message: "Collection name is required" });
        }
        const collection = await Collection.findOne({
            where: {
                collection_name: {
                    [Op.iLike]: `${collection_name}%`
                }
            }
        });
        if (!collection) {
            return res.status(404).json({ message: "Collection not found" });
        }
        return res.status(200).json({ message: "Collection found", collection });
    }catch(error){
        console.error("Error finding collection by name:", error);
        return res.status(500).json({ message: "Error finding collection by name" });
    }
}



export const createProduct = [
    authenticateToken,
    checkRole(["admin"]),
    upload.fields([
        {name : "product_image", maxCount: 1}
    ]),
    async (req, res) => {
        try{
            const { product_name,
                product_description,
                product_price,
                dimension,
                min_order,
                delivery_time
            } = req.body;
            const { product_image } = req.files;
            const { collection_id } = req.params;
           
            const collection = await Collection.findByPk(collection_id);
            if (!collection) {
                return res.status(404).json({ message: "Collection not found" });
            }
            const existingProduct = await Product.findOne({ 
                where: { 
                    product_name ,
                    collection_id
                } 
            });
            if (existingProduct) {
                return res.status(409).json({ message: "Product already exists in this collection" });
            }
            if (!product_name || !product_description || !product_price || !dimension || 
                !min_order || !delivery_time || !req.files?.product_image) {
                return res.status(400).json({ message: "Please provide all required fields" });
            }
            const product = await Product.create({
                collection_id : collection.collection_id,
                product_name,
                product_description,
                product_price,
                product_image : req.files.product_image[0].path,
                dimension,
                min_order,
                delivery_time
            });
            return res.status(201).json({ message: "Product created successfully", collection :{
                collection_id : collection.collection_id,
                collection_name : collection.collection_name,
                product
            } });
        }catch (error) {
            console.error("Error creating product:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }
]

export const updateProduct = [ 
    authenticateToken,
    checkRole(["admin"]),
    upload.fields([
         {name : "product_image", maxCount: 1}
    ]),
        async (req, res) => {
            try{
                const { product_id, collection_id} = req.params;
                let { product_name,
                    product_description,
                    product_price,
                    dimension,
                    min_order,
                    delivery_time
                } = req.body;
                const {product_image} = req.files;
                
                const collection = await Collection.findOne({ where: { collection_id } });
                if (!collection) {
                    return res.status(404).json({ message: "Collection not found" });
                }
               
                const existingProduct = await Product.findByPk(product_id);
                if (!existingProduct) {
                    return res.status(404).json({ message: "No Product found" });
                }
                const duplicateProduct = await Product.findOne({
                    where: {
                        product_name : existingProduct.product_name,
                        collection_id : existingProduct.collection_id
                    }
                });
                if(duplicateProduct){
                    return res.status(409).json({ message: "Product name already exists in this collection" });
                }
                if(product_image){
                    existingProduct.product_image = product_image[0].path;
                }
                if(product_name){
                    existingProduct.product_name = product_name;
                }
                
                
                existingProduct.product_description = product_description || existingProduct.product_description;
                existingProduct.product_price = product_price || existingProduct.product_price;
                existingProduct.product_image = product_image ? product_image[0].path : existingProduct.product_image;
                existingProduct.dimension = dimension || existingProduct.dimension;
                existingProduct.min_order = min_order || existingProduct.min_order;
                existingProduct.delivery_time = delivery_time || existingProduct.delivery_time;
               
                

                await existingProduct.save();
                
                return res.status(200).json({ message: "Product updated successfully", collection : {
                    collection_name : collection.collection_name,
                    product : existingProduct
                } 
                });
            }catch (error) {
                console.error("Error updating product:", error);
                return res.status(500).json({ message: "Internal server error" });
            }
    }
]

export const deleteProduct = [ 
    authenticateToken,
    checkRole(["admin"]),
    async (req, res) => {
        try {
            const { product_id, collection_id } = req.params;
            
            const existingProduct = await Product.findByPk(product_id);
            if (!existingProduct) {
                return res.status(404).json({ message: "Product not found" });
            }
            const collection = await Product.findOne({ where: { collection_id } });
            if (!collection) {
                return res.status(404).json({ message: "Collection not found" });
            }
            if (existingProduct.collection_id !== collection.collection_id) {
                return res.status(400).json({ message: "Product does not belong to this collection" });
            }
            await existingProduct.destroy();
            return res.status(200).json({ message: "Product deleted successfully" });
        }catch (error) {
            console.error("Error deleting product:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }
]

export const getAllProducts = [
    // checkRole(["admin", "customer"]),
    async (req, res) => {
        try {
            const products = await Product.findAll();
            if (products.length === 0) {
                return res.status(404).json({ message: "No products found" });
            }
            return res.status(200).json({ message: "Products retrieved successfully", products });
        } catch (error) {
            console.error("Error retrieving products:", error);
            return res.status(500).json({ message: "Error retrieving products" });
        }
    }
]

export const getProductById = [
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

export const getProductsByCollectionId = async (req, res) => {
    try {
        const {collection_id} = req.params;
        const products = await Product.findAll({where : {
            collection_id
        }});
       return res.status(200).json({ message: "Products retrieved successfully", products });
    }catch (error) {
        console.error("Error retrieving products by collection ID:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}   

export const getProductByCollectionName = async(req, res) => {
    try{
       const {collection_name} = req.query;
         
          const collection = await Collection.findAll({where : {
            collection_name : {
                [Op.iLike] : `%${collection_name}%`
            }
        }});
          if(!collection){
                return res.status(404).json({message : "No collection found with this name"})
          }
          const products = await Product.findAll();
         
          return res.status(200).json({message : "products successfully found", collection : {
            collection_id : collection.collection_id,
            collection_name : collection.collection_name,
            products
          }})
    }catch(error){
        console.error("Error getting product by collecction name ", error);
        return res.status(500).json({message : "Error getting product by collection name"})
    }
}

export const getProductByProductName = async (req, res) => {
    try{
        const {product_name} = req.query;
        if(!product_name){
            return res.status(400).json({message : "No product dound with this name"})
        }
        const products = await Product.findAll({where: {
            product_name: {
                [Op.iLike]: `${product_name}%`
            }
        }})
        if(!products || products.length < 0 ){
            return res.status(400).json({message : "No product found for with this name"}) 
         
        }
        
        return res.status(200).json({message : "products successfully found", products})

    }catch(error){
        console.error("Error getting product by collecction name ", error);
        return res.status(500).json({message : "Error getting product by collection name"})
    }
}

export const filteredProducts = async (req, res) => {
    try{
        const {product_name, product_price, min_order} = req.query;
        const filters = {};
        if (product_name) {
            filters.product_name = {
                [Op.iLike]: `%${product_name}%`
            };
        }
        if (product_price) {
            filters.product_price = {
                [Op.lte]: parseFloat(product_price)
            };
        }
        if (min_order) {
            filters.min_order = {
                [Op.gte]: parseInt(min_order, 10)
            };
        }
        const products = await Product.findAll({ where: filters });
        return res.status(200).json({ message: "Filtered products retrieved successfully", products });

    }catch (error){
        console.error("Error filtering products:", error);
        return res.status(500).json({ message: "Error filtering products" });
    }
}

export const paginatedProducts = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const products = await Product.findAndCountAll({
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        return res.status(200).json({
            message: "Products retrieved successfully",
            products: products.rows,
            totalItems: products.count,
            totalPages: Math.ceil(products.count / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        console.error("Error retrieving paginated products:", error);
        return res.status(500).json({ message: "Error retrieving paginated products" });
    }
}

