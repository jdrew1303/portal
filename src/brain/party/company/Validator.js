import {jsonRpcRequest} from 'utilities/network'
import ReasonsInvalid from 'brain/validate/reasonInvalid/ReasonsInvalid'

const Validator = {

  /**
   * @param {Company} company
   * @param {string} action
   * @returns {Promise<any>}
   */
  async Validate({company, action}) {
    let response = await jsonRpcRequest({
      method: 'CompanyValidator.Validate',
      request: {
        company,
        action,
      },
    })
    response.reasonsInvalid = new ReasonsInvalid(response.reasonsInvalid)
    return response
  },
}

export default Validator