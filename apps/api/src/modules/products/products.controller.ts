import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductVariantDto } from './dto/create-variant.dto';
import { UpdateProductVariantDto } from './dto/update-variant.dto';
import { ConnectMarketplaceProductDto } from './dto/connect-marketplace-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('products')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * POST /api/v1/products
   * Creates a new master product and its inline variants.
   */
  @Post()
  @Permissions('products:write')
  @HttpCode(HttpStatus.CREATED)
  async createProduct(@Body() dto: CreateProductDto) {
    return this.productsService.createProduct(dto);
  }

  /**
   * GET /api/v1/products
   * Retrieves all master products, supporting pagination and search.
   */
  @Get()
  @Permissions('products:read')
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('brand') brand?: string,
  ) {
    return this.productsService.findAll({ page, limit, search, category, brand });
  }

  /**
   * GET /api/v1/products/:id
   * Retrieves detailed product information including variants and mappings.
   */
  @Get(':id')
  @Permissions('products:read')
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  /**
   * PATCH /api/v1/products/:id
   * Updates master product details.
   */
  @Patch(':id')
  @Permissions('products:write')
  async updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.updateProduct(id, dto);
  }

  /**
   * DELETE /api/v1/products/:id
   * Soft deletes a master product.
   */
  @Delete(':id')
  @Permissions('products:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProduct(@Param('id') id: string) {
    return this.productsService.deleteProduct(id);
  }

  /**
   * POST /api/v1/products/:id/variants
   * Creates a variant under an existing master product.
   */
  @Post(':id/variants')
  @Permissions('products:write')
  @HttpCode(HttpStatus.CREATED)
  async createVariant(@Param('id') id: string, @Body() dto: CreateProductVariantDto) {
    return this.productsService.createVariant(id, dto);
  }

  /**
   * PATCH /api/v1/product-variants/:id
   * Updates a specific product variant details.
   * Note: This route has a separate prefix to keep it clean.
   */
  @Patch('variants/:id')
  @Permissions('products:write')
  async updateVariant(@Param('id') id: string, @Body() dto: UpdateProductVariantDto) {
    return this.productsService.updateVariant(id, dto);
  }

  /**
   * POST /api/v1/products/mapping
   * Binds a local master variant SKU to an external marketplace listing.
   */
  @Post('mapping')
  @Permissions('products:write')
  @HttpCode(HttpStatus.OK)
  async createMapping(@Body() dto: ConnectMarketplaceProductDto) {
    return this.productsService.createOrUpdateMapping(dto);
  }

  /**
   * POST /api/v1/products/:id/sync
   * Triggers manual synchronization for a product across all its active channels.
   */
  @Post(':id/sync')
  @Permissions('products:write')
  @HttpCode(HttpStatus.OK)
  async triggerProductSync(@Param('id') id: string) {
    await this.productsService.triggerProductSync(id);
    return { message: 'Synchronization triggered successfully' };
  }
}
