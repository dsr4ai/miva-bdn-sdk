class MivaBDNError extends Error {
  /**
   * An optional machine-readable error code (e.g. `sso_failed`). Present on
   * runtime errors reported by the embedded application; typically absent on
   * setup/validation errors thrown synchronously.
   */
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
    Object.setPrototypeOf(this, MivaBDNError.prototype);
  }
}

export default MivaBDNError;
