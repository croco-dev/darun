import { useNavigate } from '@darun/utils-router';

export function useNewProductButton() {
  const navigate = useNavigate();

  const moveToNewProduct = () => {
    navigate('/products/new');
  };
  return {
    moveToNewProduct,
  };
}
