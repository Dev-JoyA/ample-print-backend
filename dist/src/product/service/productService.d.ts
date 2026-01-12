import { ICollection, IProduct, ProductData, ProductFilter, PaginatedCollections } from "../model/productInterface.js";
export declare function createCollection(name: string): Promise<ICollection>;
export declare function updateCollection(id: string, name: string): Promise<ICollection>;
export declare function deleteCollection(id: string): Promise<string>;
export declare function getCollectionById(id: string): Promise<ICollection>;
export declare function getAllCollections(): Promise<ICollection[]>;
export declare function searchCollections(search: string): Promise<ICollection[]>;
export declare function getCollectionsPaginated(page?: number, limit?: number): Promise<PaginatedCollections>;
export interface PaginatedProducts {
    products: IProduct[];
    total: number;
    page: number;
    limit: number;
}
export declare function createProduct(collectionId: string, data: ProductData): Promise<IProduct>;
export declare function updateProduct(id: string, data: Partial<ProductData>): Promise<IProduct>;
export declare function deleteProduct(id: string): Promise<string>;
export declare function getProductById(id: string): Promise<IProduct>;
export declare function getAllProducts(): Promise<IProduct[]>;
export declare function searchProducts(search: string): Promise<IProduct[]>;
export declare function getProductsPaginated(page?: number, limit?: number): Promise<PaginatedProducts>;
export declare function filterProducts(filter: ProductFilter, page?: number, limit?: number): Promise<PaginatedProducts>;
export declare function getProductsByCollectionId(collectionId: string): Promise<IProduct[]>;
export declare function searchProductsByName(search: string, page?: number, limit?: number): Promise<PaginatedProducts>;
//# sourceMappingURL=productService.d.ts.map