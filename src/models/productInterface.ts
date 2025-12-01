import { Document, Schema , model, Types } from "mongoose";

export interface ICollection extends Document {
    name : string;
    createdAt: Date;
    updatedAt: Date;
}

export enum ProductStatus {
    Active = 'active',
    Inactive = 'inactive',
    Archived = 'archived'
}

export interface IProduct extends Document {
    collectionId : Types.ObjectId;
    name : string;
    description : string;
    price : number;
    dimension : {
        width : string;
        height : string;
    };
    minOrder : number;
    image : string;
    filename : string,
    images : string[];
    filenames : string[];
    material : string;
    status : ProductStatus;
    deliveryDay : string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ProductData {
  name: string;
  description: string;
  price: number;
  dimension: {
    width: string;
    height: string;
  };
  minOrder: number;
  image: string;
  images?: string[];
  material?: string;
  deliveryDay: string;
}

export interface CollectionWithProducts {
  _id: Types.ObjectId;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  products: {
    _id: Types.ObjectId;
    name: string;
    description: string;
    price: number;
    dimension: {
      width: string;
      height: string;
    };
    minOrder: number;
    image: string;
    filename: string;
    images: string[];
    filenames: string[];
    material?: string;
    status: ProductStatus;
    deliveryDay: string;
    createdAt: Date;
    updatedAt: Date;
  }[];
}

export interface PaginatedCollections {
  collections: ICollection[];
  total: number;
  page: number;
  limit: number;
}

export interface ProductFilter {
  priceMin?: number;
  priceMax?: number;
  status?: ProductStatus;
  deliveryDay?: string;
  collectionId?: string;
}