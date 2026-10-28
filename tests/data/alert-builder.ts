import { fmtPrice } from './market';

export type AlertDirection = 'above' | 'below';

export interface AlertInput {
  direction: AlertDirection;
  /** Exactly what the user types into the price field (VND thousands, e.g. "30.00"). */
  price: string;
}

/** Visible text of an alert row and the name of its delete button, e.g. "Above 30.00". */
export const alertLabel = ({ direction, price }: AlertInput): string => `${direction === 'above' ? 'Above' : 'Below'} ${fmtPrice(Math.round(Number(price) * 1000))}`;

/** Price-alert test data: defaults are valid; override only what a test is about. */
export class AlertBuilder {
  private direction: AlertDirection = 'above';
  private price = '30.00';

  above(): this {
    this.direction = 'above';
    return this;
  }

  below(): this {
    this.direction = 'below';
    return this;
  }

  atPrice(price: string): this {
    this.price = price;
    return this;
  }

  build(): AlertInput {
    return { direction: this.direction, price: this.price };
  }
}

export const anAlert = (): AlertBuilder => new AlertBuilder();

/** Invalid price inputs and the message the form must show for each. */
export const invalidAlertPrices = {
  empty: { input: '', message: 'Enter an alert price' },
  notANumber: { input: 'abc', message: 'Price must be a positive number' },
  negative: { input: '-5', message: 'Price must be a positive number' },
  zero: { input: '0', message: 'Price must be a positive number' },
  tooManyDecimals: { input: '24.555', message: 'Use at most 2 decimal places' },
} as const;
