import { useState, type ReactNode } from 'react'
import { JourneyCard } from '../../components/JourneyCard'
import { ReportAction } from '../../components/ReportAction'
import { TransportResultCard } from '../../components/TransportResultCard'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Chip, StatusChip, VerificationChip } from '../../components/ui/Chip'
import { Checkbox, Field, Input, Radio, Select, Textarea } from '../../components/ui/Field'
import { ConfirmDialog, Modal } from '../../components/ui/Modal'
import { EmptyState, ErrorState, LoadingList } from '../../components/ui/States'
import { Stepper } from '../../components/ui/Stepper'
import { useToast } from '../../components/ui/toast/toastContext'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-space-md">
      <h2 className="text-headline-sm font-headline-sm">{title}</h2>
      {children}
    </section>
  )
}

/** Dev-only gallery of shared components (/dev/ui). All data here is SAMPLE. */
export function UiKit() {
  const toast = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [step, setStep] = useState(1)

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-space-xl px-margin-mobile py-space-xl md:px-margin">
      <h1 className="text-headline-xl font-headline-xl">UI kit</h1>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-space-sm">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Cancel journey</Button>
          <Button loading>Saving</Button>
          <Button disabled>Disabled</Button>
          <Button size="lg">Large</Button>
        </div>
      </Section>

      <Section title="Chips">
        <div className="flex flex-wrap gap-space-sm">
          {(['pending', 'under_review', 'verified', 'rejected', 'suspended'] as const).map((s) => (
            <VerificationChip key={s} status={s} />
          ))}
        </div>
        <div className="flex flex-wrap gap-space-sm">
          {(['pending', 'accepted', 'rejected', 'cancelled', 'closed'] as const).map((s) => (
            <StatusChip key={s} status={s} />
          ))}
          <Chip tone="info">SAMPLE</Chip>
        </div>
      </Section>

      <Section title="Form fields">
        <Card className="grid gap-space-md md:grid-cols-2">
          <Field label="Origin" hint="Choose a suburb, station or landmark.">
            {(c) => <Input {...c} placeholder="e.g. Tembisa" />}
          </Field>
          <Field label="Destination" error="Choose a destination from the list.">
            {(c) => <Input {...c} defaultValue="Midrnd" />}
          </Field>
          <Field label="Date">{(c) => <Input {...c} type="date" />}</Field>
          <Field label="Departure time">{(c) => <Input {...c} type="time" />}</Field>
          <Field label="Transport type">
            {(c) => (
              <Select {...c}>
                <option>Any</option>
                <option>Minibus taxi</option>
                <option>Shuttle</option>
              </Select>
            )}
          </Field>
          <Field label="Notes" optional>
            {(c) => <Textarea {...c} />}
          </Field>
          <div>
            <Checkbox label="I accept the Terms and Privacy Notice" />
            <Radio name="freq" label="Once-off" defaultChecked />
            <Radio name="freq" label="Recurring" description="Repeats on selected weekdays" />
          </div>
        </Card>
      </Section>

      <Section title="Stepper">
        <Stepper steps={['Personal info', 'Preferences', 'Confirm']} current={step} />
        <div className="flex gap-space-sm">
          <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))}>
            Back
          </Button>
          <Button onClick={() => setStep((s) => Math.min(2, s + 1))}>Next</Button>
        </div>
      </Section>

      <Section title="Cards">
        <div className="grid gap-space-md md:grid-cols-2">
          <TransportResultCard
            href="#"
            operatorName="Midrand Shuttle Demo"
            verification="pending"
            transportType="Shuttle"
            originLabel="Tembisa Plaza"
            destinationLabel="Midrand Gautrain"
            scheduleSummary="Weekdays · 06:30, 07:15, 08:00"
            fareCents={4500}
            updatedAt="2026-11-21T08:00:00Z"
          />
          <TransportResultCard
            href="#"
            operatorName="Gauteng Commuter Services Demo"
            verification="verified"
            transportType="Minibus taxi"
            originLabel="Tembisa Rank"
            destinationLabel="Midrand CBD"
            scheduleSummary="Daily · every 20 min, 05:00–19:00"
            fareCents={null}
            updatedAt="2026-09-01T08:00:00Z"
            needsConfirmation
          />
          <JourneyCard
            href="#"
            publisherName="Kabelo M."
            originZone="Tembisa Plaza zone"
            destinationZone="Midrand Gautrain zone"
            scheduleSummary="Mon–Fri · around 06:45"
            seatsAvailable={2}
            matchReasons={['Starts near your origin', 'Departs 15 min before your usual time']}
          />
          <JourneyCard
            href="#"
            publisherName="Kabelo M."
            originZone="Kempton Park zone"
            destinationZone="Waterfall City zone"
            scheduleSummary="Sat 30 Nov · 07:00"
            seatsAvailable={0}
            requestStatus="pending"
          />
        </div>
      </Section>

      <Section title="States">
        <EmptyState
          title="No requests yet"
          description="When you request to join a journey or contact an operator, it will show up here."
          action={<Button variant="outline">Find transport</Button>}
        />
        <ErrorState onRetry={() => toast.show({ title: 'Retrying…' })} />
        <LoadingList count={2} />
      </Section>

      <Section title="Overlays & feedback">
        <div className="flex flex-wrap gap-space-sm">
          <Button variant="outline" onClick={() => setModalOpen(true)}>
            Open modal
          </Button>
          <Button variant="outline" onClick={() => setConfirmOpen(true)}>
            Open confirm
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.success('Request sent', 'We’ll notify you when Kabelo responds.')}
          >
            Success toast
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toast.error('Couldn’t send request', 'Check your connection and try again.')
            }
          >
            Error toast
          </Button>
          <ReportAction
            subject="this listing"
            onSubmit={() => toast.success('Report sent', 'Our team will review it.')}
          />
        </div>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Example modal"
          description="Focus is trapped here. Press Esc to close."
          footer={<Button onClick={() => setModalOpen(false)}>Done</Button>}
        >
          <Field label="A field inside the modal">{(c) => <Input {...c} />}</Field>
        </Modal>
        <ConfirmDialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false)
            toast.success('Journey cancelled')
          }}
          title="Cancel this journey?"
          description="Riders with accepted requests will be notified."
          confirmLabel="Cancel journey"
          confirmVariant="destructive"
        />
      </Section>
    </div>
  )
}
