import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {
  withStyles,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText, Tooltip, Fab, CardHeader,
} from '@material-ui/core'
import DeviceIcon from '@material-ui/icons/DevicesOther'
import {BEPTable} from 'components/table/index'
import {
  TK102 as TK102Entity,
  RecordHandler as TK102RecordHandler,
  Administrator as TK102Administrator
} from 'brain/tracker/tk102/index'
import {CompanyRecordHandler} from 'brain/party/company'
import {ClientRecordHandler} from 'brain/party/client'
import {SystemRecordHandler} from 'brain/party/system'
import {
  allPartyTypes,
  CompanyPartyType,
  ClientPartyType,
  SystemPartyType,
} from 'brain/party/types'
import {ReasonsInvalid} from 'brain/validate/index'
import {TextCriterionType} from 'brain/search/criterion/types'
import {ListTextCriterion} from 'brain/search/criterion/list'
import {Query} from 'brain/search/index'
import {HumanUserLoginClaims} from 'brain/security/claims'
import SearchDialogTextField
  from 'components/searchDialogTextField/SearchDialogTextfield'
import {IdIdentifier} from 'brain/search/identifier'
import {retrieveFromList} from 'brain/search/identifier/utilities'
import {
  MdAdd as AddIcon, MdClear as CancelIcon,
  MdEdit as EditIcon,
  MdSave as SaveIcon,
} from 'react-icons/md'

const styles = theme => ({
  root: {
    width: 'calc(100% - 16px)',
    margin: 0,
  },
  formField: {
    height: '60px',
    minWidth: '150px',
  },
  progress: {
    margin: 2
  },
  detailCard: {},
  detailCardTitle: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    gridTemplateRows: '1fr',
    alignItems: 'center',
  },
  tk102Icon: {
    fontSize: 100,
    color: theme.palette.primary.main
  },
  button: {
    margin: theme.spacing.unit,
  },
  buttonIcon: {
    fontSize: '20px',
  },
})

const states = {
  nop: 0,
  viewingExisting: 1,
  editingNew: 2,
  editingExisting: 3
}

const events = {
  init: states.nop,

  selectExisting: states.viewingExisting,

  startCreateNew: states.editingNew,
  cancelCreateNew: states.nop,
  createNewSuccess: states.nop,

  startEditExisting: states.editingExisting,
  finishEditExisting: states.nop,
  cancelEditExisting: states.viewingExisting
}

function recordHandlerSelect(partyType) {
  switch (partyType) {
    case SystemPartyType:
      return SystemRecordHandler
    case CompanyPartyType:
      return CompanyRecordHandler
    case ClientPartyType:
      return ClientRecordHandler
    default:
  }
}

class TK102 extends Component {
  constructor(props) {
    super(props)
    this.renderControlIcons = this.renderControlIcons.bind(this)
    this.renderTK102Details = this.renderTK102Details.bind(this)
    this.handleFieldChange = this.handleFieldChange.bind(this)
    this.handleSaveNew = this.handleSaveNew.bind(this)
    this.handleCriteriaQueryChange = this.handleCriteriaQueryChange.bind(this)
    this.collect = this.collect.bind(this)
    this.handleSelect = this.handleSelect.bind(this)
    this.handleCreateNew = this.handleCreateNew.bind(this)
    this.handleCancelCreateNew = this.handleCancelCreateNew.bind(this)
    this.handleSaveChanges = this.handleSaveChanges.bind(this)
    this.handleStartEditExisting = this.handleStartEditExisting.bind(this)
    this.handleCancelEditExisting = this.handleCancelEditExisting.bind(this)
    this.getPartyName = this.getPartyName.bind(this)
    this.updateEntityMap = this.updateEntityMap.bind(this)
    this.collectTimeout = () => {
    }
    this.partyIsRoot = props.claims.partyType === SystemPartyType
    this.updateEntityMap(props.party, props.claims.partyType)
  }

  state = {
    recordCollectionInProgress: false,
    activeState: events.init,
    original: new TK102Entity(),
    selected: new TK102Entity(),
    selectedRowIdx: -1,
    records: [],
    totalNoRecords: 0
  }
  entityMap = {
    Company: [],
    Client: [],
    System: []
  }
  reasonsInvalid = new ReasonsInvalid()

  collectCriteria = []
  collectQuery = new Query()

  updateEntityMap(newEntity, entityType) {
    switch (entityType) {
      case SystemPartyType:
        if (this.getPartyName(SystemPartyType,
            new IdIdentifier(newEntity.id)) === '') {
          this.entityMap.System.push(newEntity)
        }
        break

      case CompanyPartyType:
        if (this.getPartyName(CompanyPartyType,
            new IdIdentifier(newEntity.id)) === '') {
          this.entityMap.Company.push(newEntity)
        }
        break

      case ClientPartyType:
        if (this.getPartyName(ClientPartyType,
            new IdIdentifier(newEntity.id)) === '') {
          this.entityMap.Client.push(newEntity)
        }
        break

      default:
        console.error('invalid new entity party type', entityType)
    }
  }

  componentDidMount() {
    this.collect()
  }

  handleCreateNew() {
    const {claims} = this.props
    let newTK102Entity = new TK102Entity()
    newTK102Entity.parentId = claims.partyId
    newTK102Entity.ownerPartyType = claims.partyType
    newTK102Entity.ownerId = claims.partyId
    newTK102Entity.assignedPartyType = claims.partyType
    newTK102Entity.assignedId = claims.partyId

    this.setState({
      selectedRowIdx: -1,
      activeState: events.startCreateNew,
      selected: newTK102Entity
    })
  }

  handleFieldChange(event) {
    let {selected} = this.state
    const fieldName = event.target.name ? event.target.name : event.target.id

    switch (fieldName) {
      case 'ownerPartyType':
        // if owner party type changed clear owner id
        selected['ownerId'] = new IdIdentifier()
        selected[fieldName] = event.target.value
        break

      case 'ownerId':
        selected[fieldName] = new IdIdentifier(event.target.value.id)
        this.updateEntityMap(event.target.value, selected.ownerPartyType)
        break

      case 'assignedPartyType':
        // if assigned party type changed clear assigned id
        selected['assignedId'] = new IdIdentifier()
        selected[fieldName] = event.target.value
        break

      case 'assignedId':
        selected[fieldName] = new IdIdentifier(event.target.value.id)
        this.updateEntityMap(event.target.value, selected.assignedPartyType)
        break

      default:
        selected[fieldName] = event.target.value
    }
    this.reasonsInvalid.clearField(fieldName)
    this.setState({selected})
  }

  async handleSaveNew() {
    const {selected} = this.state
    const {NotificationSuccess, NotificationFailure} = this.props

    // perform validation
    try {
      const reasonsInvalid = await selected.validate('Create')
      if (reasonsInvalid.count > 0) {
        this.reasonsInvalid = reasonsInvalid
        return
      }
    } catch (e) {
      console.error('Error Validating TK102', e)
      NotificationFailure('Error Validating TK102')
      return
    }

    // if validation passes, perform create
    try {
      await selected.create()
      NotificationSuccess('Successfully Created TK102')
      this.setState({activeState: events.createNewSuccess})
      await this.collect()
    } catch (e) {
      console.error('Error Creating TK102', e)
      NotificationFailure('Error Creating TK102')
    }
  }

  handleCancelCreateNew() {
    this.reasonsInvalid.clearAll()
    this.setState({activeState: events.cancelCreateNew})
  }

  async handleSaveChanges() {
    const {original, selected} = this.state
    const {NotificationSuccess, NotificationFailure} = this.props

    // perform validation
    try {
      const reasonsInvalid = await selected.validate('Update')
      if (reasonsInvalid.count > 0) {
        this.reasonsInvalid = reasonsInvalid
        return
      }
    } catch (e) {
      console.error('Error Validating TK102', e)
      NotificationFailure('Error Validating TK102')
      return
    }

    // check if owner or assignment has changed and call the
    // services specific to them if either of them have changed
    if (
      original.ownerPartyType !== selected.ownerPartyType ||
      original.ownerId.id !== selected.ownerId.id ||
      original.assignedPartyType !== selected.assignedPartyType ||
      original.assignedId.id !== selected.assignedId.id
    ) {
      try {
        await TK102Administrator.ChangeOwnershipAndAssignment(selected)
      } catch (e) {
        console.error('Error Changing Ownership and Assignment', e)
        NotificationFailure('Error Changing Ownership and Assignment')
        return
      }
    }

    this.setState({
      activeState: events.finishEditExisting,
    })
    NotificationSuccess('Successfully Updated TK102')
  }

  handleStartEditExisting() {
    const {selected} = this.state
    this.setState({
      original: new TK102Entity(selected),
      activeState: events.startEditExisting
    })
  }

  handleCancelEditExisting() {
    const {original} = this.state
    this.setState({
      activeState: events.cancelEditExisting,
      selected: new TK102Entity(original)
    })
  }

  async collect() {
    const {NotificationFailure} = this.props

    this.setState({recordCollectionInProgress: true})
    // fetch tk102 records
    let response
    try {
      response = await TK102RecordHandler.Collect(
        this.collectCriteria,
        this.collectQuery
      )
    } catch (e) {
      console.error('error collecting tk102 records', e)
      NotificationFailure('Failed To Fetch TK102 Records')
      this.setState({recordCollectionInProgress: false})
      return
    }

    // compile list criteria for retrieval of client and company
    // entities associated with these TK102 devices
    let systemEntityIds = []
    let clientEntityIds = []
    let companyEntityIds = []
    response.records.forEach(record => {
      switch (record.ownerPartyType) {
        case SystemPartyType:
          if (!systemEntityIds.includes(record.ownerId.id)) {
            systemEntityIds.push(record.ownerId.id)
          }
          break
        case CompanyPartyType:
          if (!companyEntityIds.includes(record.ownerId.id)) {
            companyEntityIds.push(record.ownerId.id)
          }
          break
        case ClientPartyType:
          if (!clientEntityIds.includes(record.ownerId.id)) {
            clientEntityIds.push(record.ownerId.id)
          }
          break
        default:
      }

      switch (record.assignedPartyType) {
        case SystemPartyType:
          if (!systemEntityIds.includes(record.assignedId.id)) {
            systemEntityIds.push(record.assignedId.id)
          }
          break
        case CompanyPartyType:
          if (!companyEntityIds.includes(record.assignedId.id)) {
            companyEntityIds.push(record.assignedId.id)
          }
          break
        case ClientPartyType:
          if (!clientEntityIds.includes(record.assignedId.id)) {
            clientEntityIds.push(record.assignedId.id)
          }
          break
        default:
      }
    })

    // fetch system entities
    try {
      if (systemEntityIds.length > 0) {
        const blankQuery = new Query()
        blankQuery.limit = 0
        this.entityMap.System = (await SystemRecordHandler.Collect(
          [
            new ListTextCriterion({
              field: 'id',
              list: systemEntityIds
            })
          ],
          blankQuery
        )).records
      }
    } catch (e) {
      this.entityMap.System = []
      console.error('error collecting system records', e)
      NotificationFailure('Failed To Fetch System Records')
      this.setState({recordCollectionInProgress: false})
      return
    }

    // fetch company entities
    try {
      if (companyEntityIds.length > 0) {
        const blankQuery = new Query()
        blankQuery.limit = 0
        this.entityMap.Company = (await CompanyRecordHandler.Collect(
          [
            new ListTextCriterion({
              field: 'id',
              list: companyEntityIds
            })
          ],
          blankQuery
        )).records
      }
    } catch (e) {
      this.entityMap.Company = []
      console.error('error collecting company records', e)
      NotificationFailure('Failed To Fetch Company Records')
      this.setState({recordCollectionInProgress: false})
      return
    }

    // fetch client entities
    try {
      if (clientEntityIds.length > 0) {
        const blankQuery = new Query()
        blankQuery.limit = 0
        this.entityMap.Client = (await ClientRecordHandler.Collect(
          [
            new ListTextCriterion({
              field: 'id',
              list: clientEntityIds
            })
          ],
          blankQuery
        )).records
      }
    } catch (e) {
      this.entityMap.Client = []
      console.error('error collecting client records', e)
      NotificationFailure('Failed To Fetch Client Records')
      this.setState({recordCollectionInProgress: false})
      return
    }

    this.setState({
      recordCollectionInProgress: false,
      records: response.records,
      totalNoRecords: response.total
    })
  }

  handleCriteriaQueryChange(criteria, query) {
    this.collectCriteria = criteria
    this.collectQuery = query
    this.collectTimeout = setTimeout(this.collect, 300)
    this.setState({
      activeState: events.init,
      selected: new TK102Entity(),
      selectedRowIdx: -1
    })
  }

  handleSelect(rowRecordObj, rowIdx) {
    this.reasonsInvalid.clearAll()
    this.setState({
      selectedRowIdx: rowIdx,
      selected: new TK102Entity(rowRecordObj),
      activeState: events.selectExisting
    })
  }

  getPartyName(partyType, partyId) {
    const list = this.entityMap[partyType]
    const entity = retrieveFromList(partyId, list ? list : [])
    return entity ? entity.name : ''
  }

  render() {
    const {
      recordCollectionInProgress,
      selectedRowIdx,
      records,
      totalNoRecords,
      activeState,
    } = this.state
    const {
      theme,
      classes,
    } = this.props

    let cardTitle = (
        <Typography variant={'h6'}>
          Select A TK102 to View or Edit
        </Typography>
    )
    switch (activeState) {
      case states.editingNew:
        cardTitle = (
            <div className={classes.detailCardTitle}>
              <Typography variant={'h6'}>
                New User
              </Typography>
              <Grid container
                    direction='row'
                    justify='flex-end'
              >
                <Grid item>
                  {this.renderControlIcons()}
                </Grid>
              </Grid>
            </div>
        )
        break
      case states.editingExisting:
        cardTitle = (
            <div className={classes.detailCardTitle}>
              <Typography variant={'h6'}>
                Editing
              </Typography>
              <Grid container
                    direction='row'
                    justify='flex-end'
              >
                <Grid item>
                  {this.renderControlIcons()}
                </Grid>
              </Grid>
            </div>
        )
        break
      case states.viewingExisting:
        cardTitle = (
            <div className={classes.detailCardTitle}>
              <Typography variant={'h6'}>
                Details
              </Typography>
              <Grid container
                    direction='row'
                    justify='flex-end'
              >
                <Grid item>
                  {this.renderControlIcons()}
                </Grid>
              </Grid>
            </div>
        )
        break
      default:
    }

    return (
        <Grid
            id={'userConfigurationRoot'}
            className={classes.root}
            container direction='column'
            spacing={8}
            alignItems='center'
        >
          <Grid item xl={12}>
          <Grid container>
            <Grid item>
              <Card
                  id={'userConfigurationDetailCard'}
                  className={classes.detailCard}
              >
                <CardHeader title={cardTitle}/>
                <CardContent>
                  {this.renderTK102Details()}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          </Grid>
          <Grid item xl={12}>
            <Card>
              <CardContent>
                <BEPTable
                    loading={recordCollectionInProgress}
                    totalNoRecords={totalNoRecords}
                    noDataText={'No TK102 Devices Found'}
                    data={records}
                    onCriteriaQueryChange={this.handleCriteriaQueryChange}
                    columns={[
                      {
                        Header: 'Owner Party Type',
                        accessor: 'ownerPartyType',
                        width: 136,
                        config: {
                          filter: {
                            type: TextCriterionType,
                          },
                        },
                      },
                      {
                        Header: 'Owned By',
                        accessor: 'ownerId',
                        width: 150,
                        Cell: rowCellInfo => {
                          try {
                            return this.getPartyName(
                          rowCellInfo.original.ownerPartyType,
                          rowCellInfo.value
                            )
                          } catch (e) {
                            console.error('error getting owner info', e)
                            return '-'
                          }
                        },
                        config: {
                          filter: {
                            type: TextCriterionType,
                          },
                        },
                      },
                      {
                        Header: 'Assigned Party Type',
                        accessor: 'assignedPartyType',
                        width: 160,
                        config: {
                          filter: {
                            type: TextCriterionType,
                          },
                        },
                      },
                      {
                        Header: 'Assigned To',
                        accessor: 'assignedId',
                        width: 150,
                        Cell: rowCellInfo => {
                          try {
                            return this.getPartyName(
                          rowCellInfo.original.assignedPartyType,
                          rowCellInfo.value
                            )
                          } catch (e) {
                            console.error('error getting assigned info', e)
                            return '-'
                          }
                        },
                        config: {
                          filter: {
                            type: TextCriterionType,
                          },
                        },
                      },
                      {
                        Header: 'Sim Country Code',
                        accessor: 'simCountryCode',
                        width: 150,
                        config: {
                          filter: {
                            type: TextCriterionType,
                          },
                        },
                      },
                      {
                        Header: 'Sim Number',
                        accessor: 'simNumber',
                        width: 150,
                        config: {
                          filter: {
                            type: TextCriterionType,
                          },
                        },
                      },
                      {
                        Header: 'Manufacturer Id',
                        accessor: 'manufacturerId',
                        width: 150,
                        config: {
                          filter: {
                            type: TextCriterionType,
                          },
                        },
                      },
                    ]}
                    getTdProps={(state, rowInfo) => {
                      const rowIndex = rowInfo ? rowInfo.index : undefined
                      return {
                        onClick: (e, handleOriginal) => {
                          if (rowInfo) {
                            this.handleSelect(rowInfo.original, rowInfo.index)
                          }
                          if (handleOriginal) {
                            handleOriginal()
                          }
                        },
                        style: {
                          background:
                        rowIndex === selectedRowIdx
                            ? theme.palette.secondary.light
                            : 'white',
                          color:
                        rowIndex === selectedRowIdx
                            ? theme.palette.secondary.contrastText
                            : theme.palette.primary.main
                        }
                      }
                    }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
    )
  }
  renderTK102Details() {
    const {activeState} = this.state
    const {classes} = this.props
    const fieldValidations = this.reasonsInvalid.toMap()
    const helperText = field =>
        fieldValidations[field] ? fieldValidations[field].help : undefined
    const disableFields = activeState === states.viewingExisting

    switch (activeState) {
      case states.nop:
        return (
            <Grid container
                  direction='column'
                  spacing={8}
                  alignItems={'center'}>
            <Grid item>
              <DeviceIcon className={classes.tk102Icon} />
            </Grid>
            <Grid item>
              <Fab
                  id={'userConfigurationNewUserButton'}
                  color={'primary'}
                  className={classes.button}
                  size={'small'}
                  onClick={this.handleCreateNew}
              >
                <Tooltip title='Add New Device'>
                  <AddIcon className={classes.buttonIcon}/>
                </Tooltip>
              </Fab>
            </Grid>
          </Grid>
        )
      case states.viewingExisting:
      case states.editingNew:
      case states.editingExisting:
        const {selected} = this.state
        return (
            <Grid container direction='column' spacing={8} alignItems='center'>
            <Grid item>
              <Typography variant='body1' align='center' color='primary'>
                {(() => {
                  switch (activeState) {
                    case states.editingNew:
                      return 'Creating New'
                    case states.editingExisting:
                      return 'Editing'
                    case states.viewingExisting:
                      return 'Details'
                    default:
                  }
                })()}
              </Typography>
            </Grid>
            <Grid item>
              <Grid container direction='row' spacing={8}>
                <Grid item>
                  <Grid container direction='column' spacing={8}>
                    <Grid item>
                      <FormControl
                          className={classes.formField}
                          error={!!fieldValidations.ownerPartyType}
                          aria-describedby='ownerPartyType'
                      >
                        <InputLabel htmlFor='ownerPartyType'>
                          Owner Party Type
                        </InputLabel>
                        <Select
                            id='ownerPartyType'
                            name='ownerPartyType'
                            value={selected.ownerPartyType}
                            onChange={this.handleFieldChange}
                            disabled={disableFields || !this.partyIsRoot}
                            style={{ width: 150 }}
                        >
                          <MenuItem value=''>
                            <em>None</em>
                          </MenuItem>
                          {allPartyTypes.map((partyType, idx) => {
                            return (
                              <MenuItem key={idx} value={partyType}>
                                {partyType}
                              </MenuItem>
                            )
                          })}
                        </Select>
                        {!!fieldValidations.ownerPartyType && (
                            <FormHelperText id='ownerPartyType'>
                              {helperText('ownerPartyType')}
                          </FormHelperText>
                        )}
                      </FormControl>
                    </Grid>
                    <Grid item>
                      <FormControl
                          className={classes.formField}
                          error={!!fieldValidations.assignedPartyType}
                          aria-describedby='assignedPartyType'
                      >
                        <InputLabel htmlFor='assignedPartyType'>
                          Assigned Party Type
                        </InputLabel>
                        <Select
                            id='assignedPartyType'
                            name='assignedPartyType'
                            value={selected.assignedPartyType}
                            onChange={this.handleFieldChange}
                            disabled={disableFields}
                            style={{ width: 165 }}
                        >
                          <MenuItem value=''>
                            <em>None</em>
                          </MenuItem>
                          {allPartyTypes.map((partyType, idx) => {
                            return (
                              <MenuItem key={idx} value={partyType}>
                                {partyType}
                              </MenuItem>
                            )
                          })}
                        </Select>
                        {!!fieldValidations.assignedPartyType && (
                            <FormHelperText id='assignedPartyType'>
                              {helperText('assignedPartyType')}
                          </FormHelperText>
                        )}
                      </FormControl>
                    </Grid>
                    <Grid item>
                      <TextField
                          className={classes.formField}
                          id='simCountryCode'
                          label='Sim Country Code'
                          value={selected.simCountryCode}
                          onChange={this.handleFieldChange}
                          disabled={disableFields}
                          helperText={helperText('simCountryCode')}
                          error={!!fieldValidations.simCountryCode}
                      />
                    </Grid>
                    <Grid item>
                      <TextField
                          className={classes.formField}
                          id='manufacturerId'
                          label='Manufacturer Id'
                          value={selected.manufacturerId}
                          onChange={this.handleFieldChange}
                          disabled={disableFields}
                          helperText={helperText('manufacturerId')}
                          error={!!fieldValidations.manufacturerId}
                      />
                    </Grid>
                  </Grid>
                </Grid>
                <Grid item>
                  <Grid container direction='column' spacing={8}>
                    <Grid item>
                      <SearchDialogTextField
                          className={classes.formField}
                          id='ownerId'
                          label='Owned By'
                          value={this.getPartyName(
                          selected.ownerPartyType,
                          selected.ownerId
                        )}
                          onChange={this.handleFieldChange}
                          disabled={disableFields || !this.partyIsRoot}
                          helperText={helperText('ownerId')}
                          error={!!fieldValidations.ownerId}
                          recordHandler={recordHandlerSelect(
                          selected.ownerPartyType
                        )}
                          undefinedMessage={
                            'Please First Select Owner Party Type'
                        }
                          searchColumns={[
                          {
                            Header: 'Name',
                            accessor: 'name',
                            config: {
                              filter: {
                                type: TextCriterionType,
                              }
                            }
                          }
                        ]}
                      />
                    </Grid>
                    <Grid item>
                      <SearchDialogTextField
                          className={classes.formField}
                          id='assignedId'
                          label='Assigned To'
                          value={this.getPartyName(
                          selected.assignedPartyType,
                          selected.assignedId
                        )}
                          onChange={this.handleFieldChange}
                          disabled={disableFields}
                          helperText={helperText('assignedId')}
                          error={!!fieldValidations.assignedId}
                          recordHandler={recordHandlerSelect(
                          selected.assignedPartyType
                        )}
                          undefinedMessage={
                            'Please First Select Owner Party Type'
                        }
                          searchColumns={[
                          {
                            Header: 'Name',
                            accessor: 'name',
                            config: {
                              filter: {
                                type: TextCriterionType,
                              }
                            }
                          }
                        ]}
                      />
                    </Grid>
                    <Grid item>
                      <TextField
                          className={classes.formField}
                          id='simNumber'
                          label='Sim Number'
                          value={selected.simNumber}
                          onChange={this.handleFieldChange}
                          disabled={disableFields}
                          helperText={helperText('simNumber')}
                          error={!!fieldValidations.simNumber}
                      />
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        )

      default:
    }
  }

  renderControlIcons() {
    const {activeState} = this.state
    const {classes} = this.props

    switch (activeState) {
      case states.viewingExisting:
        return (
            <React.Fragment>
              <Fab
                  color={'primary'}
                  className={classes.button}
                  size={'small'}
                  onClick={this.handleStartEditExisting}
            >
                <Tooltip title='Edit'>
                  <EditIcon className={classes.buttonIcon}/>
                </Tooltip>
              </Fab>
              <Fab
                  id={'deviceConfigurationNewUserButton'}
                  className={classes.button}
                  size={'small'}
                  onClick={this.handleCreateNew}
            >
                <Tooltip title='Add New Device'>
                  <AddIcon className={classes.buttonIcon}/>
                </Tooltip>
              </Fab>
            </React.Fragment>
        )

      case states.editingNew:
        return (
          <CardActions>
            <Fab
                color={'primary'}
                className={classes.button}
                size={'small'}
                onClick={this.handleSaveNew}
            >
              <Tooltip title='Save New Device'>
                <SaveIcon className={classes.buttonIcon}/>
              </Tooltip>
            </Fab>
            <Fab
                className={classes.button}
                size={'small'}
                onClick={this.handleCancelCreateNew}
            >
              <Tooltip title='Cancel'>
                <CancelIcon className={classes.buttonIcon}/>
              </Tooltip>
            </Fab>
          </CardActions>
        )

      case states.editingExisting:
        return (
          <CardActions>
            <Fab
                color={'primary'}
                className={classes.button}
                size={'small'}
                onClick={this.handleSaveChanges}
            >
              <Tooltip title='Save Changes'>
                <SaveIcon className={classes.buttonIcon}/>
              </Tooltip>
            </Fab>
            <Fab
                className={classes.button}
                size={'small'}
                onClick={this.handleCancelEditExisting}
            >
              <Tooltip title='Cancel'>
                <CancelIcon className={classes.buttonIcon}/>
              </Tooltip>
            </Fab>
          </CardActions>
        )

      case states.nop:
      default:
    }
  }
}

TK102 = withStyles(styles, {withTheme: true})(TK102)

TK102.propTypes = {
  /**
   * Success Action Creator
   */
  NotificationSuccess: PropTypes.func.isRequired,
  /**
   * Failure Action Creator
   */
  NotificationFailure: PropTypes.func.isRequired,
  /**
   * Login claims from redux state
   */
  claims: PropTypes.instanceOf(HumanUserLoginClaims),
  /**
   * Party from redux state
   */
  party: PropTypes.object.isRequired
}

TK102.defaultProps = {}

export default TK102
