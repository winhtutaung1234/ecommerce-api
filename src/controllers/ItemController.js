const Item = require("../models/Item");
const asyncHandler = require("express-async-handler");
const MainCategory = require("../models/MainCategory");
const filterAllowFields = require("../utils/filterAllowFields");
const ItemImage = require("../models/ItemImage");
const ItemResource = require("../resources/ItemResource");
const { Sequelize, Model } = require("sequelize");
const Car = require("../models/Car");
const Company = require("../models/Company");
const Engine = require("../models/Engine");
const CarModel = require("../models/CarModel");
const Discount = require("../models/Discount");

const includeFields = [MainCategory, ItemImage];

const ItemController = {
  find: asyncHandler(async (req, res) => {
    const { user } = req;
    const { feature, universal, category } = req.query;
    const where = {};

    if (feature === "true") {
      where.is_feature = true;
    }

    if (universal === "true") {
      where.is_universal = true;
    }

    if (category) {
      where.main_category_id = category;
    }

    const include = [
      ...includeFields,
      {
        model: Car,
        include: [
          { model: Company, attributes: ["name"] },
          { model: CarModel, attributes: ["name"] },
          { model: Engine, attributes: ["enginepower"] },
        ],
      },
    ];

    const limit = 10;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    const { count, rows: items } = await Item.findAndCountAll({
      where,
      include,
      limit,
      offset,
      attributes: [
        "id",
        "name",
        "brandName",
        "description",
        "main_category_id",
        "is_feature",
        "is_universal",
        "OE_NO",
        [
          Sequelize.literal(
            user.percentage === 0
              ? "price"
              : `ROUND(price / ${user.percentage}, 2)`
          ),
          "price",
        ],
      ],
    });

    const filteredItems = items.map((item) => {
      if (!user.is_approve) {
        item.price = "****";
      }

      if (item.is_universal === true) {
        item.cars = null;
      }
      return item;
    });

    const totalPages = Math.ceil(count / limit);
    const nextPage = page < totalPages ? page + 1 : null;
    const prevPage = page > 1 ? page - 1 : null;

    const url = `${req.protocol}://${req.get("host")}${
      req.originalUrl.split("?")[0]
    }`;

    return res.json(
      ItemResource.collection({
        meta: {
          page,
          totalItems: items.length,
          totalPages,
        },
        links: {
          next: `${url}?page=${nextPage}`,
          previous: `${url}?page=${prevPage}`,
        },
        data: filteredItems,
      })
    );
  }),

  getDiscountItems: asyncHandler(async (req, res) => {
    const { user } = req;

    const limit = 10;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    const { count, rows: items } = await Item.findAndCountAll({
      limit,
      offset,
      include: [
        ...includeFields,
        {
          model: Discount,
          where: { is_active: true },
          required: true,
          attributes: ["discount_type", "discount_value"],
        },
        {
          model: Car,
          include: [
            { model: Company, attributes: ["name"] },
            { model: CarModel, attributes: ["name"] },
            { model: Engine, attributes: ["enginepower"] },
          ],
        },
      ],
      attributes: [
        "id",
        "name",
        "brandName",
        "description",
        "main_category_id",
        "is_feature",
        "is_universal",
        "OE_NO",
        [
          Sequelize.literal(
            user.percentage === 0
              ? "price"
              : `ROUND(price / ${user.percentage}, 2)`
          ),
          "price",
        ],
      ],
    });

    const discountedItems = items.map((item) => {
      let itemPrice = parseFloat(item.price);

      const discounts = [];

      item.discounts.forEach((discount) => {
        let discountAmount = 0;
        let discountPrice = itemPrice;

        if (discount.discount_type === "percentage") {
          discountAmount =
            itemPrice * (parseFloat(discount.discount_value) / 100);
        } else if (discount.discount_type === "fixed") {
          discountAmount = parseFloat(discount.discount_value);
        }

        // cap the discount amount to avoid the negative price
        discountAmount = Math.min(discountAmount, itemPrice);
        discountPrice = itemPrice - discountAmount;

        discountAmount = Math.round(discountAmount * 100) / 100;
        discountPrice = Math.round(discountPrice * 100) / 100;

        discounts.push({
          discount_type: discount.discount_type,
          discount_value: discount.discount_value,
          discountAmount: discountAmount,
          discountPrice: discountPrice,
        });
      });

      return {
        ...item.toJSON(),
        price: itemPrice,
        discounts: discounts,
      };
    });

    const filteredItems = discountedItems.map((item) => {
      if (!user.is_approve) {
        item.price = "****";
      }

      if (item.is_universal === true) {
        item.cars = null;
      }
      return item;
    });

    const totalPages = Math.ceil(count / limit);
    const nextPage = page < totalPages ? page + 1 : null;
    const prevPage = page > 1 ? page - 1 : null;

    const url = `${req.protocol}://${req.get("host")}${
      req.originalUrl.split("?")[0]
    }`;

    return res.json(
      ItemResource.collection({
        meta: {
          page,
          totalItems: items.length,
          totalPages,
        },
        links: {
          next: `${url}?page=${nextPage}`,
          previous: `${url}?page=${prevPage}`,
        },
        data: filteredItems,
      })
    );
  }),

  create: asyncHandler(async (req, res) => {
    const {
      name,
      brandName,
      main_category_id,
      is_feature,
      is_universal,
      OE_NO,
      quantity,
      status_id,
      LKB_No,
      description,
      price,
    } = req.body;

    const result = await Item.create({
      name,
      brandName,
      main_category_id,
      is_feature,
      is_universal,
      OE_NO,
      quantity,
      status_id,
      LKB_No,
      description,
      price,
    });

    if (result) {
      const item = new ItemResource(result).exec();
      return res.json(item);
    }
  }),

  upload: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const images = req.files;

    if (!images || images.length === 0) {
      return res.status(400).json({
        msg: "No images uploaded!",
      });
    }

    const item = await Item.findByPk(id);

    if (!item) return res.status(404).json({ msg: "Item not found!" });

    const paths = images.map((image) => ({
      item_id: item.id,
      path: image.filename,
    }));

    const result = await ItemImage.bulkCreate(paths);

    return res.json(result);
  }),

  update: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const allowFields = [
      "name",
      "brandName",
      "main_category_id",
      "is_feature",
      "is_universal",
      "OE_NO",
      "price",
    ];

    const filteredBody = filterAllowFields(req.body, allowFields);

    if (!filteredBody) return res.sendStatus(204);

    const [result] = await Item.update(filteredBody, { where: { id } });

    if (!result) return res.status(400).json({ msg: "update failed!" });

    const updateData = await Item.findOne({
      where: { id },
      include: includeFields,
    });

    return res.json(new ItemResource(updateData).exec());
  }),

  destroy: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await Item.destroy({ where: { id } });

    if (!result) return res.status(400).json({ msg: "Item not found!" });

    return res.sendStatus(204);
  }),
};

module.exports = ItemController;
