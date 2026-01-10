import uuid

from fastapi import APIRouter, Body, HTTPException, status
from sqlalchemy import select

from app.api.deps import AdminUser, CurrentTenant, DB
from app.core.security import get_password_hash
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.schemas.tenant import TenantCreate, TenantResponse, TenantUpdate
from app.schemas.user import UserCreate

router = APIRouter()


@router.post("/", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
async def create_tenant(
    db: DB,
    tenant_in: TenantCreate = Body(..., embed=True),
    admin_user: UserCreate = Body(..., embed=True),
):
    """
    Create a new tenant (organization) with an admin user.
    This endpoint is public for initial registration.
    """
    # Check if slug is unique
    query = select(Tenant).where(Tenant.slug == tenant_in.slug)
    result = await db.execute(query)
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization slug already exists",
        )

    # Create tenant
    tenant = Tenant(
        name=tenant_in.name,
        slug=tenant_in.slug,
        logo_url=tenant_in.logo_url,
        primary_color=tenant_in.primary_color,
    )
    db.add(tenant)
    await db.flush()

    # Create admin user
    admin = User(
        tenant_id=tenant.id,
        email=admin_user.email,
        hashed_password=get_password_hash(admin_user.password),
        full_name=admin_user.full_name,
        role=UserRole.ADMIN,
    )
    db.add(admin)
    await db.flush()
    await db.refresh(tenant)

    return tenant


@router.get("/current", response_model=TenantResponse)
async def get_current_tenant(tenant: CurrentTenant):
    """Get current tenant information."""
    return tenant


@router.get("/by-slug/{slug}", response_model=TenantResponse)
async def get_tenant_by_slug(slug: str, db: DB):
    """Get tenant by slug (public endpoint for login page)."""
    query = select(Tenant).where(Tenant.slug == slug, Tenant.is_active == True)
    result = await db.execute(query)
    tenant = result.scalar_one_or_none()

    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    return tenant


@router.patch("/current", response_model=TenantResponse)
async def update_current_tenant(
    tenant_update: TenantUpdate,
    tenant: CurrentTenant,
    admin_user: AdminUser,
    db: DB,
):
    """Update current tenant (admin only)."""
    update_data = tenant_update.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(tenant, field, value)

    await db.flush()
    await db.refresh(tenant)

    return tenant
