import express from 'express';
import Order_Product from '../models/orderProduct';
import Order from '../models/orderModel';
import Product from '../models/productModel';
import { authenticateToken } from "../utils/auth"
import { Profile } from '../models/profileModel';
import {createDesign} from "./uploadController"
import emails from "../utils/email"
import User_Design from '../models/userDesignModel';
import { Op } from 'sequelize';
import { checkRole } from '../middleware/authorization';


const orderItems =[
    checkRole["customer"],
    authenticateToken,
    async(req, res) => {
    try{
        const {product_id} = req.query;
        const {quantity} = req.body;
        const product = await Product.findAll({where : {product_id}})
        if(product.length == 0 ){
            return res.status(400).json({message : "Choose atleasst one product for this order"});
        }
        const user = req.user;
        const profile = await Profile.findOne({where : {user_id : user.user_id}})
        if(!profile){
            return res.status(400).json({message : "sign up to make an order"})
        }
        if(!user){
            return res.status(400).json({message : "sign in to make an order"})
        }
        const order = await Order.create({
            user_id : user.user_id,
            payment_status : "pending",
            is_deposit_paid : false,
            deposit_paid : 0.00,
            total_amount : 0.00
        })

        const user_design = await User_Design.findOne({where : {user_id : user.user_id}})

        const order_product = await Order_Product.create({
            debsign_id : user_design.design_id || null,
            order_id : order.order_id,
            product_id : product_id,
            quantity : quantity,
            customer_file_url : null,
            customer_voice_notes : null
        })

        const payDeposit = Order.findOne({where : order.order_id})
        if(!payDeposit.is_deposit_paid){
            return res.status(400).json({message : "deposit needs to be paid to complete order"})
        }

        payDeposit.is_deposit_paid = true;
        payDeposit.save();
         try {
                    await emails(
                        profile.email,
                        "ORDER CREATED",
                        "ORDER CREATED",
                        profile.userName,
                        `Your order have been successfuly created with ID ${order.order_id}`,
                        "https://ampleprinthub.com"
                    );
                }catch (emailError) {
                    console.error(`Email failed: ${emailError}`);
                }

        return res.status(200).json({message : "order is successfully created", order, order_product})

        }catch (error) {
        console.error("Error fetching order items:", error);
        res.status(500).json({ error: "error ordering items" });
    }

}   
]