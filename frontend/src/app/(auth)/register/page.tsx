'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [orgName, setOrgName] = useState('')
  const [orgSlug, setOrgSlug] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleOrgNameChange = (value: string) => {
    setOrgName(value)
    // Auto-generate slug
    const slug = value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    setOrgSlug(slug)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Create tenant with admin user
      await api.post('/tenants/', {
        tenant_in: {
          name: orgName,
          slug: orgSlug,
        },
        admin_user: {
          email,
          password,
          full_name: fullName,
        },
      })

      router.push(`/login?registered=true&slug=${orgSlug}`)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail.map((e: any) => e.msg).join(', '))
      } else if (typeof detail === 'string') {
        setError(detail)
      } else {
        setError('Erro ao criar organizacao')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Criar Organizacao</CardTitle>
        <CardDescription>
          Crie sua escola, clube ou liga de tenis
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="orgName" className="text-sm font-medium">
              Nome da Organizacao
            </label>
            <Input
              id="orgName"
              placeholder="Escola de Tenis XYZ"
              value={orgName}
              onChange={(e) => handleOrgNameChange(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="orgSlug" className="text-sm font-medium">
              Codigo (URL)
            </label>
            <Input
              id="orgSlug"
              placeholder="escola-xyz"
              value={orgSlug}
              onChange={(e) => setOrgSlug(e.target.value.toLowerCase())}
              pattern="^[a-z0-9-]+$"
              required
            />
            <p className="text-xs text-gray-500">
              Usado para acessar: {orgSlug || 'seu-codigo'}.tennisleague.com
            </p>
          </div>

          <hr className="my-4" />

          <div className="space-y-2">
            <label htmlFor="fullName" className="text-sm font-medium">
              Seu Nome
            </label>
            <Input
              id="fullName"
              placeholder="Joao Silva"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Senha
            </label>
            <Input
              id="password"
              type="password"
              placeholder="Minimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Criando...' : 'Criar Organizacao'}
          </Button>
          <p className="text-sm text-gray-600 text-center">
            Ja tem uma conta?{' '}
            <Link href="/login" className="text-blue-600 hover:underline">
              Entrar
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
