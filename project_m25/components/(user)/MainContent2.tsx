import React, { useState, useEffect } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import { formatCurrencyUSD } from "@/public";
import Image from "next/image";

const MainContent2: React.FC = () => {
  const [allProducts, setAllProducts] = useState<Product[]>([]); // Lưu trữ tất cả sản phẩm
  const [products, setProducts] = useState<Product[]>([]); // Sản phẩm hiển thị trên trang
  const [loading, setLoading] = useState<boolean>(true);
  const [receiveName, setReceiveName] = useState<string>("");
  const [receiveAddress, setReceiveAddress] = useState<string>("");
  const [receivePhone, setReceivePhone] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [sortOrder, setSortOrder] = useState<string>("asc");
  const [filterCategory, setFilterCategory] =
    useState<string>("Cơ đánh Predator");

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterAndSortProducts();
  }, [allProducts, searchTerm, currentPage, sortOrder, filterCategory]);

  const fetchProducts = async () => {
    try {
      const { data } = await axios.get("http://localhost:8080/products");
      setAllProducts(data); // Lưu trữ tất cả sản phẩm
    } catch (error) {
      console.error("Lỗi lấy data sản phẩm:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortProducts = () => {
    // Lọc và sắp xếp sản phẩm
    const filteredProducts = allProducts
      .filter((prod: Product) => prod.category === filterCategory)
      .filter((prod: Product) =>
        prod.product_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a: Product, b: Product) => {
        const aPrice = parseFloat(a.unit_price.replace(/[^0-9.]/g, ""));
        const bPrice = parseFloat(b.unit_price.replace(/[^0-9.]/g, ""));
        return sortOrder === "asc" ? aPrice - bPrice : bPrice - aPrice;
      });

    // Cập nhật sản phẩm cho trang hiện tại
    const startIndex = (currentPage - 1) * itemsPerPage;
    const selectedProducts = filteredProducts.slice(
      startIndex,
      startIndex + itemsPerPage
    );
    setProducts(selectedProducts);
  };

  useEffect(() => {
    const savedName = localStorage.getItem("receiveName");
    const savedAddress = localStorage.getItem("receiveAddress");
    const savedPhone = localStorage.getItem("receivePhone");

    if (savedName) setReceiveName(savedName);
    if (savedAddress) setReceiveAddress(savedAddress);
    if (savedPhone) setReceivePhone(savedPhone);
  }, []);

  const handleAddToCart = async (product: Product) => {
    const userId = localStorage.getItem("adminToken");

    if (!userId) {
      toast.error("Bạn cần đăng nhập để mua hàng.");
      return;
    }

    const cleanPrice = product.unit_price.replace(/[^0-9.]/g, "");
    const unitPrice = parseFloat(cleanPrice);

    if (isNaN(unitPrice)) {
      toast.error("Giá sản phẩm không hợp lệ.");
      return;
    }

    const orderData: Order = {
      id: Math.ceil(Math.random() * 999999).toString(),
      user_id: userId,
      order_at: new Date().toISOString(),
      total_price: "0.00",
      status: true,
      note: "",
      order_detail: [],
      receive_name: receiveName,
      receive_address: receiveAddress,
      receive_phone: receivePhone,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const { data: existingOrders } = await axios.get(
        `http://localhost:8080/orders?user_id=${userId}`
      );
      const existingOrder = existingOrders[0];

      if (existingOrder) {
        const existingItemIndex = existingOrder.order_detail.findIndex(
          (item: OrderDetail) => item.productId === product.id
        );

        if (existingItemIndex >= 0) {
          existingOrder.order_detail[existingItemIndex].quantity += 1;
          toast.success("Sản phẩm đã được cập nhật trong giỏ hàng!");
        } else {
          const newCartItem: OrderDetail = {
            productId: product.id,
            productName: product.product_name,
            unitPrice: product.unit_price,
            quantity: 1,
            image: product.image,
          };
          existingOrder.order_detail.push(newCartItem);
          toast.success("Đã thêm sản phẩm vào giỏ hàng!");
        }

        existingOrder.total_price = existingOrder.order_detail
          .reduce(
            (total: number, item: OrderDetail) =>
              total +
              parseFloat(item.unitPrice.replace(/[^0-9.]/g, "")) *
                item.quantity,
            0
          )
          .toFixed(2);

        existingOrder.total_price = formatCurrencyUSD(
          parseFloat(existingOrder.total_price)
        );

        existingOrder.receive_name = receiveName;
        existingOrder.receive_address = receiveAddress;
        existingOrder.receive_phone = receivePhone;

        await axios.put(
          `http://localhost:8080/orders/${existingOrder.id}`,
          existingOrder
        );
      } else {
        const newCartItem: OrderDetail = {
          productId: product.id,
          productName: product.product_name,
          unitPrice: product.unit_price,
          quantity: 1,
          image: product.image,
        };
        orderData.order_detail.push(newCartItem);

        orderData.total_price = formatCurrencyUSD(unitPrice);
        await axios.post("http://localhost:8080/orders", orderData);
        toast.success("Đã thêm sản phẩm vào giỏ hàng!");
      }

      // Lưu thông tin người nhận vào localStorage
      localStorage.setItem("receiveName", receiveName);
      localStorage.setItem("receiveAddress", receiveAddress);
      localStorage.setItem("receivePhone", receivePhone);
    } catch (error) {
      console.error("Error fetching or updating order:", error);
      toast.error("Có lỗi xảy ra khi xử lý đơn hàng.");
    }
  };

  const totalPages = Math.ceil(allProducts.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex mb-4">
        <input
          type="text"
          placeholder="Tìm kiếm sản phẩm..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1); // Reset trang khi tìm kiếm
          }}
          className="border rounded w-full p-2"
        />
        <select
          onChange={(e) => {
            setSortOrder(e.target.value);
            setCurrentPage(1); // Reset trang khi sắp xếp
          }}
          className="ml-2 border rounded p-2"
        >
          <option value="asc">Giá: Thấp đến Cao</option>
          <option value="desc">Giá: Cao đến Thấp</option>
        </select>
      </div>
      <main className="flex-grow container mx-auto p-4">
        {products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="relative border rounded-lg overflow-hidden shadow-md p-3 flex flex-col h-full"
              >
                <Image src={product.image} alt="loi" width={200} height={200} />
                <h3 className="font-bold">{product.product_name}</h3>
                <span>
                  From:{" "}
                  {formatCurrencyUSD(
                    parseFloat(product.unit_price.replace(/[^0-9.]/g, ""))
                  )}
                </span>
                <button
                  className="bg-yellow-500 text-black mt-auto rounded"
                  onClick={() => handleAddToCart(product)}
                >
                  THÊM VÀO GIỎ HÀNG
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div>Không có sản phẩm nào phù hợp.</div>
        )}
      </main>

      <div className="flex justify-center mt-4">
        {Array.from({ length: totalPages }, (_, index) => (
          <button
            key={index + 1}
            onClick={() => handlePageChange(index + 1)}
            className={`mx-1 px-3 py-1 rounded ${
              currentPage === index + 1
                ? "bg-blue-500 text-white"
                : "bg-gray-300"
            }`}
          >
            {index + 1}
          </button>
        ))}
      </div>
      <Toaster />
    </div>
  );
};

export default MainContent2;
