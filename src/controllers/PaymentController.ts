import { Request, Response } from "express";
import gDB from "../InitDataSource";
import {
  PaymentEntity,
  PaymentMethod,
  PaymentStatus,
} from "../entity/Payment.entity";
import paypal = require("paypal-rest-sdk");
import { OrderEntity } from "../entity/Order.entity";
import { OrderStatus } from "../helper/Enum";

paypal.configure({
  mode: "sandbox",
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_CLIENT_SECRET,
});

export class PaymentController {
  static async createPayment(req: Request, res: Response) {
    const { amount, orderId, userId } = req.body;

    if (!amount || amount <= 0 || !orderId || !userId) {
      console.log("Missing payment information in request body.");
      return res
        .status(400)
        .send("Missing payment information in request body.");
    }

    // const paymentTotal = amount.total
    //
    // if (!paymentTotal || paymentTotal <= 0) {
    //   return res
    //     .status(400)
    //     .send('Missing payment information in request body.')
    // }

    const paymentRepo = gDB.getRepository(PaymentEntity);
    const newPayment = new PaymentEntity();
    newPayment.paymentStatus = PaymentStatus.PAID;
    newPayment.paymentMethod = PaymentMethod.PAYPAL;
    newPayment.totalAmount = amount;
    newPayment.orderId = orderId;
    newPayment.userId = userId;

    await paymentRepo.save(newPayment);

    const orderRepo = gDB.getRepository(OrderEntity);
    let orderToUpdate = await orderRepo.findOne({ where: { id: orderId } });
    orderToUpdate.orderStatus = OrderStatus.PAID;

    // console.log(newPayment)
    // console.log(orderToUpdate)

    await orderRepo.save(orderToUpdate);

    return res.status(200).send("Payment successful.");
  }
}
