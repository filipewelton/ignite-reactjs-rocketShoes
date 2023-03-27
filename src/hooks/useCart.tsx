import { createContext, ReactNode, useContext, useState } from 'react'
import { toast } from 'react-toastify'

import { api } from '../services/api'
import { Product, Stock } from '../types'

interface CartProviderProps {
  children: ReactNode
}

interface UpdateProductAmount {
  productId: number
  amount: number
}

interface CartContextData {
  cart: Product[]
  addProduct: (productId: number) => Promise<void>
  removeProduct: (productId: number) => void
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void
}

const CartContext = createContext<CartContextData>({} as CartContextData)

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const STORAGE_KEY = '@RocketShoes:cart'
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(STORAGE_KEY)

    if (storagedCart) {
      return JSON.parse(storagedCart)
    }

    return []
  })

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart]
      const storagedProduct = cart.find(({ id }) => id === productId)
      const stock: Stock = await api
        .get(`/stock/${productId}`)
        .then((response) => response.data)
      const currentAmount =
        storagedProduct === undefined ? 0 : storagedProduct.amount
      const amount = currentAmount + 1

      if (amount > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      if (storagedProduct) {
        storagedProduct.amount = amount
      } else {
        const product: Product = await api
          .get(`/products/${productId}`)
          .then((response) => response.data)

        updatedCart.push({
          ...product,
          amount: 1,
        })
      }

      setCart(updatedCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
    } catch (error) {
      toast.error('Erro na adição do produto')
    }
  }

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart]
      const productIndex = cart.findIndex(({ id }) => id === productId)

      if (productIndex === -1) {
        throw Error()
      }

      updatedCart.splice(productIndex, 1)
      setCart(updatedCart)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCart))
    } catch {
      toast.error('Erro na remoção do produto')
    }
  }

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const stock: Stock = await api
        .get(`/stock/${productId}`)
        .then((response) => response.data)

      if (amount <= 0) {
        return
      }

      if (amount > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      const updatedCart = [...cart]
      const product = updatedCart.find(({ id }) => id === productId) as Product

      product.amount = amount

      setCart(updatedCart)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCart))
    } catch (error) {
      toast.error('Erro na alteração de quantidade do produto')
    }
  }

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextData {
  const context = useContext(CartContext)

  return context
}
