import {
  ClientPartyType,
  CompanyPartyType,
  SystemPartyType,
} from 'brain/party/types'
import IdIdentifier from 'brain/search/identifier/Id'
import {retrieveFromList} from 'brain/search/identifier/utilities'
import Query from 'brain/search/Query'
import SystemRecordHandler from 'brain/party/system/RecordHandler'
import ListTextCriterion from 'brain/search/criterion/list/Text'
import CompanyRecordHandler from 'brain/party/company/RecordHandler'
import ClientRecordHandler from 'brain/party/client/RecordHandler'

export default class Holder {
  _entityMap = {
    Company: [],
    System: [],
    Client: [],
  }

  async load(entities, partyTypeAccessor, partyIdAccessor) {
    let systemEntityIds = []
    let companyEntityIds = []
    let clientEntityIds = []

    entities.forEach(entity => {
      switch (entity[partyTypeAccessor]) {
        case SystemPartyType:
          if (!systemEntityIds.includes(entity[partyIdAccessor].id)) {
            systemEntityIds.push(entity[partyIdAccessor].id)
          }
          break
        case CompanyPartyType:
          if (!companyEntityIds.includes(entity[partyIdAccessor].id)) {
            companyEntityIds.push(entity[partyIdAccessor].id)
          }
          break
        case ClientPartyType:
          if (!clientEntityIds.includes(entity[partyIdAccessor].id)) {
            clientEntityIds.push(entity[partyIdAccessor].id)
          }
          break
        default:
      }
    })

    // fetch system entities
    if (systemEntityIds.length > 0) {
      const blankQuery = new Query()
      blankQuery.limit = 0
      this._entityMap.System = (await SystemRecordHandler.Collect(
          [
            new ListTextCriterion({
              field: 'id',
              list: systemEntityIds,
            }),
          ],
          blankQuery,
      )).records
    }
    // fetch company entities
    if (companyEntityIds.length > 0) {
      const blankQuery = new Query()
      blankQuery.limit = 0
      this._entityMap.Company = (await CompanyRecordHandler.Collect(
          [
            new ListTextCriterion({
              field: 'id',
              list: companyEntityIds,
            }),
          ],
          blankQuery,
      )).records
    }
    // fetch client entities
    if (clientEntityIds.length > 0) {
      const blankQuery = new Query()
      blankQuery.limit = 0
      this._entityMap.Client = (await ClientRecordHandler.Collect(
          [
            new ListTextCriterion({
              field: 'id',
              list: clientEntityIds,
            }),
          ],
          blankQuery,
      )).records
    }
  }

  // retrieveEntity(partyIdentifier, partyType) {
  //   if (partyType) {
  //     return retrieveFromList(
  //         partyId,
  //         this._entityMap[partyType] ? this._entityMap[partyType] : []
  //     )
  //   }
  //
  //   let party = retrieveFromList(partyId, this._entityMap.Company)
  //   if (party) {
  //     return party
  //   }
  //
  //   party = retrieveFromList(partyId, this._entityMap.Client)
  //   if (party) {
  //     return party
  //   }
  //
  //   party = retrieveFromList(partyId, this._entityMap.System)
  //   if (party) {
  //     return party
  //   }
  //
  // }
}