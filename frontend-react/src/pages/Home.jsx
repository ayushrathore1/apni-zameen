import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Map, Search, Shield, FileText, BarChart3, ArrowRight } from 'lucide-react'
import { Button, Card, CardContent } from '@/components/ui'

export function HomePage() {
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
                Digital Land Records Platform
              </span>
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl mb-6">
                भूमि अभिलेख{' '}
                <span className="text-primary">डिजिटलीकरण</span> सहायक
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground mb-8">
                Explore land parcels transparently. Government officials can detect,
                investigate, and correct map–record mismatches through an auditable workflow.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/map">
                  <Button size="xl" className="gap-2">
                    <Map className="size-5" />
                    Explore Map
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <Link to="/search">
                  <Button variant="outline" size="xl" className="gap-2">
                    <Search className="size-5" />
                    Search Records
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute -top-40 -right-40 size-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 size-80 rounded-full bg-accent/5 blur-3xl" />
      </section>

      {/* Features Section */}
      <section className="py-20 bg-surface">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Key Features
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A comprehensive platform for land record management and discrepancy detection
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                      <feature.icon className="size-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-4xl font-bold mb-2">{stat.value}</p>
                <p className="text-primary-foreground/80">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Government Official?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            Access the official dashboard to manage discrepancies, update records,
            and generate reports.
          </p>
          <Link to="/login">
            <Button size="lg" className="gap-2">
              <Shield className="size-5" />
              Official Login
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}

const features = [
  {
    icon: Map,
    title: 'Interactive Maps',
    description: 'Explore land parcels with interactive polygon rendering, hover highlights, and smooth zoom animations.',
  },
  {
    icon: Search,
    title: 'Smart Search',
    description: 'Search by Plot ID or Owner Name in Hindi/English with fuzzy matching support.',
  },
  {
    icon: Shield,
    title: 'Secure Workflow',
    description: 'Role-based access control with auditable correction workflows for officials.',
  },
  {
    icon: FileText,
    title: 'Record Management',
    description: 'Version-controlled land records with complete change history.',
  },
  {
    icon: BarChart3,
    title: 'Discrepancy Detection',
    description: 'Automatic detection of area mismatches and name discrepancies.',
  },
  {
    icon: BarChart3,
    title: 'Reports & Export',
    description: 'Generate reconciliation reports and export data in PDF/CSV formats.',
  },
]

const stats = [
  { value: '5', label: 'Villages Covered' },
  { value: '500+', label: 'Land Parcels' },
  { value: '98%', label: 'Records Matched' },
  { value: '24/7', label: 'System Availability' },
]
