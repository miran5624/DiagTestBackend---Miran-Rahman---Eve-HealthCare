export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export class BookingStateMachine {
  static canTransition(from: string, to: string): boolean {
    const transitions: Record<string, string[]> = {
      [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.FAILED, BookingStatus.CANCELLED],
      [BookingStatus.CONFIRMED]: [BookingStatus.CANCELLED],
      [BookingStatus.FAILED]: [],
      [BookingStatus.CANCELLED]: [],
    };

    return transitions[from]?.includes(to) ?? false;
  }
}
