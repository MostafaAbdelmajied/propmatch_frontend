import { useState } from 'react'
import { PaymentModal } from './components/shared/PaymentModal'
import type { AppState, Screen, UserRole } from './types'

// Screens
import { AddProperty } from './screens/AddProperty'
import { AdminDashboard } from './screens/AdminDashboard'
import { AdminPropertyReview } from './screens/AdminPropertyReview'
import { AdminUserReview } from './screens/AdminUserReview'
import { AuthScreen } from './screens/AuthScreen'
import { ContractForm } from './screens/ContractForm'
import { ContractPreview } from './screens/ContractPreview'
import { DashboardScreen } from './screens/DashboardScreen'
import { KycFlow } from './screens/KycFlow'
import { LandingScreen } from './screens/LandingScreen'
import { LandlordDashboard } from './screens/LandlordDashboard'
import { LandlordInquiries } from './screens/LandlordInquiries'
import { LegalChatbot } from './screens/LegalChatbot'
import { ProfileScreen } from './screens/ProfileScreen'
import { PropertyDetail } from './screens/PropertyDetail'
import { TenantBrowse } from './screens/TenantBrowse'
import { TenantMatchForm } from './screens/TenantMatchForm'
import { TenantMatchResults } from './screens/TenantMatchResults'

export default function App() {
  const [state, setState] = useState<AppState>({
    screen: 'landing',
    role: 'tenant',
    isLoggedIn: false,
    isKycVerified: true,
    freeMatches: 3,
    paymentContext: null,
    showPaymentModal: true,
  })

  const nav = (screen: Screen) => setState(s => ({ ...s, screen }))
  const openPayment = (ctx: AppState['paymentContext']) =>
    setState(s => ({ ...s, paymentContext: ctx, showPaymentModal: true }))
  const closePayment = () => setState(s => ({ ...s, showPaymentModal: false }))
  const onPaymentSuccess = () => {
    const next = state.paymentContext === 'matches'
      ? setState(s => ({ ...s, freeMatches: 10, showPaymentModal: false, screen: 'tenant-match-form' }))
      : state.paymentContext === 'listing'
      ? setState(s => ({ ...s, showPaymentModal: false, screen: 'landlord-dashboard' }))
      : setState(s => ({ ...s, showPaymentModal: false, screen: 'landlord-dashboard' }))
    void next
  }
  const login = (role: UserRole) =>
    setState(s => ({ ...s, isLoggedIn: true, role, screen: role === 'admin' ? 'admin-dashboard' : 'dashboard' }))
  const switchRole = (role: UserRole) => setState(s => ({ ...s, role, screen: role === 'admin' ? 'admin-dashboard' : 'dashboard' }))
  const setKycVerified = () => setState(s => ({ ...s, isKycVerified: true }))
  const consumeMatch = () => setState(s => ({ ...s, freeMatches: Math.max(0, s.freeMatches - 1) }))

  const { screen, role, isKycVerified, freeMatches, showPaymentModal, paymentContext } = state

  const renderScreen = () => {
    if (!state.isLoggedIn) {
      if (screen === 'auth') return <AuthScreen onLogin={login} onBack={() => nav('landing')} />
      return <LandingScreen onGetStarted={() => nav('auth')} />
    }

    if (screen === 'landing') return <LandingScreen onGetStarted={() => nav('auth')} />
    if (screen === 'auth') return <AuthScreen onLogin={login} onBack={() => nav('landing')} />

    // Shared
    if (screen === 'dashboard') return <DashboardScreen role={role} isKycVerified={isKycVerified} onNav={nav} onSwitchRole={switchRole} />
    if (screen === 'profile') return <ProfileScreen isKycVerified={isKycVerified} role={role} onNav={nav} onSwitchRole={switchRole} />
    if (screen === 'legal-chatbot') return <LegalChatbot onBack={() => nav('property-detail')} />
    if (screen === 'contract-form') return <ContractForm onPreview={() => nav('contract-preview')} onBack={() => nav('landlord-inquiries')} />
    if (screen === 'contract-preview') return <ContractPreview onBack={() => nav('contract-form')} />

    // KYC
    if (['kyc-id-front','kyc-id-back','kyc-selfie','kyc-processing','kyc-success','kyc-failure','kyc-disclaimer'].includes(screen))
      return <KycFlow step={screen as any} onNext={nav} onVerified={setKycVerified} />

    // Tenant
    if (screen === 'tenant-browse') return <TenantBrowse onProperty={() => nav('property-detail')} onMatch={() => nav('tenant-match-form')} onNav={nav} role={role} onSwitchRole={switchRole} />
    if (screen === 'tenant-match-form') return <TenantMatchForm freeMatches={freeMatches} onSearch={() => { consumeMatch(); nav('tenant-match-results') }} onNav={nav} role={role} onSwitchRole={switchRole} />
    if (screen === 'tenant-match-results') return <TenantMatchResults freeMatches={freeMatches} onProperty={() => nav('property-detail')} onExhausted={() => nav('tenant-quota-exhausted')} onNav={nav} role={role} onSwitchRole={switchRole} openPayment={openPayment} />
    if (screen === 'tenant-quota-exhausted') return <TenantMatchResults freeMatches={0} onProperty={() => nav('property-detail')} onExhausted={() => nav('tenant-quota-exhausted')} onNav={nav} role={role} onSwitchRole={switchRole} openPayment={openPayment} exhausted />
    if (screen === 'property-detail') return <PropertyDetail onChatbot={() => nav('legal-chatbot')} onContract={() => nav('contract-form')} onBack={() => nav('tenant-browse')} onNav={nav} />

    // Landlord
    if (screen === 'landlord-dashboard') return <LandlordDashboard onNav={nav} role={role} onSwitchRole={switchRole} openPayment={openPayment} isKycVerified={isKycVerified} />
    if (screen === 'add-property') return <AddProperty onSubmit={() => nav('publish-pay')} onBack={() => nav('landlord-dashboard')} />
    if (screen === 'publish-pay') return <LandlordDashboard onNav={nav} role={role} onSwitchRole={switchRole} openPayment={openPayment} isKycVerified={isKycVerified} publishSuccess />
    if (screen === 'boost-listing') return <LandlordDashboard onNav={nav} role={role} onSwitchRole={switchRole} openPayment={openPayment} isKycVerified={isKycVerified} boostMode />
    if (screen === 'landlord-inquiries') return <LandlordInquiries onContract={() => nav('contract-form')} onBack={() => nav('landlord-dashboard')} />

    // Admin
    if (screen === 'admin-dashboard') return <AdminDashboard onNav={nav} />
    if (screen === 'admin-property-review') return <AdminPropertyReview onBack={() => nav('admin-dashboard')} />
    if (screen === 'admin-user-review') return <AdminUserReview onBack={() => nav('admin-dashboard')} />

    return <DashboardScreen role={role} isKycVerified={isKycVerified} onNav={nav} onSwitchRole={switchRole} />
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans" dir="rtl">
      {renderScreen()}
      {showPaymentModal && paymentContext && (
        <PaymentModal context={paymentContext} onSuccess={onPaymentSuccess} onClose={closePayment} />
      )}
    </div>
  )
}
