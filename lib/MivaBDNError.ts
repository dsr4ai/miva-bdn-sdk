class MivaBDNError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, MivaBDNError.prototype);
  }
}

export default MivaBDNError;
