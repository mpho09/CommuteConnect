import { describe, expect, it } from 'vitest'
import { validatePublish, type PublishValues } from './publishSchema'

// 2026-12-01 08:30 SAST (a Tuesday)
const now = new Date('2026-12-01T06:30:00Z')

const base: PublishValues = {
  journeyType: 'recurring',
  origin: { id: 'tembisa-plaza', label: 'Tembisa Plaza' },
  destination: { id: 'midrand-gautrain', label: 'Midrand Gautrain Station' },
  date: '2026-12-01',
  time: '',
  daysOfWeek: [1, 2, 3, 4, 5],
  departureTime: '06:45',
  validFrom: '2026-12-01',
  validUntil: '',
  vehicleCapacity: '4',
  seatsAvailable: '2',
  contribution: '25,50',
  notes: '  Leaving from the main entrance.  ',
  eligible: true,
}

const errorsFor = (v: Partial<PublishValues>) => validatePublish({ ...base, ...v }, now).errors

describe('validatePublish', () => {
  it('builds the API input for a valid recurring journey', () => {
    const { errors, input } = validatePublish(base, now)
    expect(errors).toEqual({})
    expect(input).toEqual({
      originId: 'tembisa-plaza',
      destinationId: 'midrand-gautrain',
      journeyType: 'recurring',
      departureAt: null,
      schedule: {
        daysOfWeek: [1, 2, 3, 4, 5],
        departureTime: '06:45',
        validFrom: '2026-12-01',
        validUntil: null,
      },
      seatsAvailable: 2,
      vehicleCapacity: 4,
      costSharingCents: 2550,
      notes: 'Leaving from the main entrance.',
    })
  })

  it('converts a once-off SAST date and time to UTC', () => {
    const { input } = validatePublish(
      { ...base, journeyType: 'once_off', date: '2026-12-02', time: '07:00', contribution: '' },
      now,
    )
    expect(input).toMatchObject({
      departureAt: '2026-12-02T05:00:00.000Z',
      schedule: null,
      costSharingCents: null,
    })
  })

  it('requires a future departure for once-off trips (BR4)', () => {
    const once = { journeyType: 'once_off' as const }
    expect(errorsFor({ ...once, date: '2026-11-30', time: '09:00' })).toHaveProperty('date')
    expect(errorsFor({ ...once, date: '2026-12-01', time: '08:00' })).toHaveProperty(
      'time',
      'That time has passed. Choose a later time.',
    )
    expect(errorsFor({ ...once, date: '2026-12-01', time: '' })).toHaveProperty('time')
  })

  it('requires days, time and a valid date range for recurring journeys (BR5)', () => {
    expect(errorsFor({ daysOfWeek: [] })).toHaveProperty('daysOfWeek', 'Choose at least one day.')
    expect(errorsFor({ departureTime: '' })).toHaveProperty('departureTime')
    expect(errorsFor({ validFrom: '' })).toHaveProperty('validFrom')
    expect(errorsFor({ validFrom: '2026-11-01' })).toHaveProperty('validFrom')
    expect(errorsFor({ validUntil: '2026-11-30' })).toHaveProperty(
      'validUntil',
      'The end date can’t be before the start date.',
    )
    // An earlier time of day is fine for a recurring schedule starting today.
    expect(errorsFor({ departureTime: '06:00' })).toEqual({})
  })

  it('requires whole seats within the vehicle’s capacity (BR6)', () => {
    expect(errorsFor({ seatsAvailable: '0' })).toHaveProperty('seatsAvailable')
    expect(errorsFor({ seatsAvailable: '1.5' })).toHaveProperty('seatsAvailable')
    expect(errorsFor({ seatsAvailable: '5' })).toHaveProperty(
      'seatsAvailable',
      'You can’t offer more seats than your vehicle has.',
    )
    expect(errorsFor({ vehicleCapacity: '16' })).toHaveProperty('vehicleCapacity')
    expect(errorsFor({ vehicleCapacity: '' })).toHaveProperty('vehicleCapacity')
  })

  it('checks places, contribution, notes and the eligibility acknowledgement', () => {
    expect(errorsFor({ origin: null })).toHaveProperty('origin')
    expect(errorsFor({ destination: base.origin })).toHaveProperty('destination')
    expect(errorsFor({ contribution: 'R25' })).toHaveProperty('contribution')
    expect(errorsFor({ contribution: '501' })).toHaveProperty('contribution')
    expect(errorsFor({ notes: 'x'.repeat(501) })).toHaveProperty('notes')
    expect(errorsFor({ eligible: false })).toHaveProperty('eligible') // BR16
  })
})
