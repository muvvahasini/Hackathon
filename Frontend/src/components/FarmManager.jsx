import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const FarmManager = () => {
    const { user } = useAuth();
    const [farms, setFarms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingFarm, setEditingFarm] = useState(null);
    const [selectedFarm, setSelectedFarm] = useState(null);
    const [showCropForm, setShowCropForm] = useState(false);
    const [editingCrop, setEditingCrop] = useState(null);
    
    // Form states
    const [farmForm, setFarmForm] = useState({
        name: '',
        description: '',
        farmType: 'mixed',
        totalArea: { value: '', unit: 'acres' },
        location: {
            address: '',
            city: '',
            state: '',
            zipCode: '',
            coordinates: { lat: 0, lng: 0 }
        },
        certifications: [],
        farmingMethods: []
    });
    
    const [cropForm, setCropForm] = useState({
        name: '',
        variety: '',
        description: '',
        plantingDate: '',
        expectedHarvestDate: '',
        area: { value: '', unit: 'acres' },
        status: 'planted',
        yield: { expected: 0, actual: 0, unit: 'kg' },
        price: 0,
        isOrganic: false,
        notes: ''
    });
    
    // File upload states
    const [farmImages, setFarmImages] = useState([]);
    const [cropImages, setCropImages] = useState([]);
    const [uploading, setUploading] = useState(false);
    
    // Refs
    const farmImageInputRef = useRef(null);
    const cropImageInputRef = useRef(null);

    useEffect(() => {
        if (user && user.role === 'farmer') {
            fetchFarms();
        }
    }, [user]);

    const fetchFarms = async () => {
        try {
            const response = await api.get('/farms/my-farms');
            setFarms(response.data.data.farms);
        } catch (error) {
            console.error('Error fetching farms:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFarmChange = (e) => {
        const { name, value } = e.target;
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFarmForm(prev => ({
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [child]: value
                }
            }));
        } else {
            setFarmForm(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleCropChange = (e) => {
        const { name, value } = e.target;
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setCropForm(prev => ({
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [child]: value
                }
            }));
        } else {
            setCropForm(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleFarmImageUpload = (e) => {
        const files = Array.from(e.target.files);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length + farmImages.length > 10) {
            alert('Maximum 10 images allowed');
            return;
        }

        const newImages = imageFiles.map(file => ({
            file,
            preview: URL.createObjectURL(file),
            name: file.name
        }));

        setFarmImages(prev => [...prev, ...newImages]);
    };

    const handleCropImageUpload = (e) => {
        const files = Array.from(e.target.files);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length + cropImages.length > 5) {
            alert('Maximum 5 images allowed per crop');
            return;
        }

        const newImages = imageFiles.map(file => ({
            file,
            preview: URL.createObjectURL(file),
            name: file.name
        }));

        setCropImages(prev => [...prev, ...newImages]);
    };

    const removeFarmImage = (index) => {
        setFarmImages(prev => prev.filter((_, i) => i !== index));
    };

    const removeCropImage = (index) => {
        setCropImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddFarm = async (e) => {
        e.preventDefault();
        setUploading(true);

        try {
            const formData = new FormData();
            
            // Add farm data
            formData.append('name', farmForm.name);
            formData.append('description', farmForm.description);
            formData.append('farmType', farmForm.farmType);
            formData.append('totalArea', JSON.stringify(farmForm.totalArea));
            formData.append('location', JSON.stringify(farmForm.location));
            formData.append('certifications', JSON.stringify(farmForm.certifications));
            formData.append('farmingMethods', JSON.stringify(farmForm.farmingMethods));
            
            // Add images
            farmImages.forEach((image, index) => {
                formData.append('images', image.file);
                formData.append('captions', image.caption || '');
            });

            const response = await api.post('/farms', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setFarms(prev => [...prev, response.data.data.farm]);
            setShowAddForm(false);
            resetFarmForm();
        } catch (error) {
            console.error('Error adding farm:', error);
        } finally {
            setUploading(false);
        }
    };

    const handleAddCrop = async (e) => {
        e.preventDefault();
        setUploading(true);

        try {
            const cropData = {
                ...cropForm,
                area: cropForm.area,
                yield: cropForm.yield
            };

            const response = await api.post(`/farms/${selectedFarm._id}/crops`, cropData);
            
            // Update the farm in the list
            setFarms(prev => prev.map(farm => 
                farm._id === selectedFarm._id ? response.data.data.farm : farm
            ));
            
            setShowCropForm(false);
            resetCropForm();
        } catch (error) {
            console.error('Error adding crop:', error);
        } finally {
            setUploading(false);
        }
    };

    const handleEditFarm = (farm) => {
        setEditingFarm(farm);
        setFarmForm({
            name: farm.name,
            description: farm.description,
            farmType: farm.farmType,
            totalArea: farm.totalArea,
            location: farm.location,
            certifications: farm.certifications,
            farmingMethods: farm.farmingMethods
        });
        setShowAddForm(true);
    };

    const handleEditCrop = (crop) => {
        setEditingCrop(crop);
        setCropForm({
            name: crop.name,
            variety: crop.variety,
            description: crop.description,
            plantingDate: crop.plantingDate.split('T')[0],
            expectedHarvestDate: crop.expectedHarvestDate.split('T')[0],
            area: crop.area,
            status: crop.status,
            yield: crop.yield,
            price: crop.price,
            isOrganic: crop.isOrganic,
            notes: crop.notes
        });
        setShowCropForm(true);
    };

    const handleUpdateFarm = async (e) => {
        e.preventDefault();
        setUploading(true);

        try {
            const response = await api.put(`/farms/${editingFarm._id}`, farmForm);
            
            setFarms(prev => prev.map(farm => 
                farm._id === editingFarm._id ? response.data.data.farm : farm
            ));
            
            setShowAddForm(false);
            setEditingFarm(null);
            resetFarmForm();
        } catch (error) {
            console.error('Error updating farm:', error);
        } finally {
            setUploading(false);
        }
    };

    const handleUpdateCrop = async (e) => {
        e.preventDefault();
        setUploading(true);

        try {
            const response = await api.put(`/farms/${selectedFarm._id}/crops/${editingCrop._id}`, cropForm);
            
            setFarms(prev => prev.map(farm => 
                farm._id === selectedFarm._id ? response.data.data.farm : farm
            ));
            
            setShowCropForm(false);
            setEditingCrop(null);
            resetCropForm();
        } catch (error) {
            console.error('Error updating crop:', error);
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteFarm = async (farmId) => {
        if (!confirm('Are you sure you want to delete this farm?')) return;

        try {
            await api.delete(`/farms/${farmId}`);
            setFarms(prev => prev.filter(farm => farm._id !== farmId));
        } catch (error) {
            console.error('Error deleting farm:', error);
        }
    };

    const handleDeleteCrop = async (cropId) => {
        if (!confirm('Are you sure you want to delete this crop?')) return;

        try {
            await api.delete(`/farms/${selectedFarm._id}/crops/${cropId}`);
            
            setFarms(prev => prev.map(farm => 
                farm._id === selectedFarm._id 
                    ? { ...farm, crops: farm.crops.filter(crop => crop._id !== cropId) }
                    : farm
            ));
        } catch (error) {
            console.error('Error deleting crop:', error);
        }
    };

    const resetFarmForm = () => {
        setFarmForm({
            name: '',
            description: '',
            farmType: 'mixed',
            totalArea: { value: '', unit: 'acres' },
            location: {
                address: '',
                city: '',
                state: '',
                zipCode: '',
                coordinates: { lat: 0, lng: 0 }
            },
            certifications: [],
            farmingMethods: []
        });
        setFarmImages([]);
    };

    const resetCropForm = () => {
        setCropForm({
            name: '',
            variety: '',
            description: '',
            plantingDate: '',
            expectedHarvestDate: '',
            area: { value: '', unit: 'acres' },
            status: 'planted',
            yield: { expected: 0, actual: 0, unit: 'kg' },
            price: 0,
            isOrganic: false,
            notes: ''
        });
        setCropImages([]);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="spinner"></div>
                <span className="ml-2">Loading farms...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">My Farms</h2>
                <button
                    onClick={() => {
                        setShowAddForm(true);
                        setEditingFarm(null);
                        resetFarmForm();
                    }}
                    className="btn btn-primary"
                >
                    + Add New Farm
                </button>
            </div>

            {/* Farms List */}
            {farms.length === 0 ? (
                <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">🌾</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No farms yet</h3>
                    <p className="text-gray-600 mb-4">Start by adding your first farm to showcase your products</p>
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="btn btn-primary"
                    >
                        Add Your First Farm
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {farms.map(farm => (
                        <div key={farm._id} className="card hover:shadow-lg transition-shadow">
                            <div className="relative">
                                {farm.images && farm.images.length > 0 ? (
                                    <img
                                        src={farm.images[0].url}
                                        alt={farm.name}
                                        className="w-full h-48 object-cover rounded-t-lg"
                                    />
                                ) : (
                                    <div className="w-full h-48 bg-gray-200 rounded-t-lg flex items-center justify-center">
                                        <span className="text-gray-400 text-4xl">🌾</span>
                                    </div>
                                )}
                                <div className="absolute top-2 right-2">
                                    <span className={`badge ${farm.isActive ? 'badge-success' : 'badge-warning'}`}>
                                        {farm.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="p-4">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">{farm.name}</h3>
                                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                                    {farm.description}
                                </p>
                                
                                <div className="space-y-2 mb-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Type:</span>
                                        <span className="font-medium">{farm.farmType}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Area:</span>
                                        <span className="font-medium">
                                            {farm.totalArea.value} {farm.totalArea.unit}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Crops:</span>
                                        <span className="font-medium">{farm.crops?.length || 0}</span>
                                    </div>
                                </div>
                                
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setSelectedFarm(farm);
                                            setShowCropForm(true);
                                            setEditingCrop(null);
                                            resetCropForm();
                                        }}
                                        className="btn btn-secondary flex-1"
                                    >
                                        Manage Crops
                                    </button>
                                    <button
                                        onClick={() => handleEditFarm(farm)}
                                        className="btn btn-outline"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDeleteFarm(farm._id)}
                                        className="btn btn-danger"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Farm Modal */}
            {showAddForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h3 className="text-xl font-semibold mb-4">
                                {editingFarm ? 'Edit Farm' : 'Add New Farm'}
                            </h3>
                            
                            <form onSubmit={editingFarm ? handleUpdateFarm : handleAddFarm} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <label className="form-label">Farm Name *</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={farmForm.name}
                                            onChange={handleFarmChange}
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label className="form-label">Farm Type</label>
                                        <select
                                            name="farmType"
                                            value={farmForm.farmType}
                                            onChange={handleFarmChange}
                                            className="form-input"
                                        >
                                            <option value="vegetable">Vegetable Farm</option>
                                            <option value="fruit">Fruit Farm</option>
                                            <option value="grain">Grain Farm</option>
                                            <option value="dairy">Dairy Farm</option>
                                            <option value="livestock">Livestock Farm</option>
                                            <option value="mixed">Mixed Farm</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div className="form-group">
                                    <label className="form-label">Description *</label>
                                    <textarea
                                        name="description"
                                        value={farmForm.description}
                                        onChange={handleFarmChange}
                                        rows="3"
                                        className="form-input"
                                        required
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <label className="form-label">Total Area *</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                name="totalArea.value"
                                                value={farmForm.totalArea.value}
                                                onChange={handleFarmChange}
                                                className="form-input flex-1"
                                                min="0"
                                                step="0.1"
                                                required
                                            />
                                            <select
                                                name="totalArea.unit"
                                                value={farmForm.totalArea.unit}
                                                onChange={handleFarmChange}
                                                className="form-input w-24"
                                            >
                                                <option value="acres">Acres</option>
                                                <option value="hectares">Hectares</option>
                                                <option value="square_meters">m²</option>
                                                <option value="square_feet">ft²</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <label className="form-label">Address *</label>
                                        <input
                                            type="text"
                                            name="location.address"
                                            value={farmForm.location.address}
                                            onChange={handleFarmChange}
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label className="form-label">City *</label>
                                        <input
                                            type="text"
                                            name="location.city"
                                            value={farmForm.location.city}
                                            onChange={handleFarmChange}
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <label className="form-label">State *</label>
                                        <input
                                            type="text"
                                            name="location.state"
                                            value={farmForm.location.state}
                                            onChange={handleFarmChange}
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label className="form-label">Zip Code *</label>
                                        <input
                                            type="text"
                                            name="location.zipCode"
                                            value={farmForm.location.zipCode}
                                            onChange={handleFarmChange}
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                </div>
                                
                                {/* Farm Images */}
                                <div className="form-group">
                                    <label className="form-label">Farm Images</label>
                                    <input
                                        ref={farmImageInputRef}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleFarmImageUpload}
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => farmImageInputRef.current?.click()}
                                        className="btn btn-secondary w-full"
                                    >
                                        📷 Upload Farm Images
                                    </button>
                                    
                                    {farmImages.length > 0 && (
                                        <div className="mt-2 grid grid-cols-4 gap-2">
                                            {farmImages.map((image, index) => (
                                                <div key={index} className="relative">
                                                    <img
                                                        src={image.preview}
                                                        alt={image.name}
                                                        className="w-full h-16 object-cover rounded"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeFarmImage(index)}
                                                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex gap-2 pt-4">
                                    <button
                                        type="submit"
                                        disabled={uploading}
                                        className="btn btn-primary flex-1"
                                    >
                                        {uploading ? 'Saving...' : (editingFarm ? 'Update Farm' : 'Add Farm')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowAddForm(false);
                                            setEditingFarm(null);
                                            resetFarmForm();
                                        }}
                                        className="btn btn-outline"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Crop Modal */}
            {showCropForm && selectedFarm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h3 className="text-xl font-semibold mb-4">
                                {editingCrop ? 'Edit Crop' : 'Add New Crop'} - {selectedFarm.name}
                            </h3>
                            
                            <form onSubmit={editingCrop ? handleUpdateCrop : handleAddCrop} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <label className="form-label">Crop Name *</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={cropForm.name}
                                            onChange={handleCropChange}
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label className="form-label">Variety</label>
                                        <input
                                            type="text"
                                            name="variety"
                                            value={cropForm.variety}
                                            onChange={handleCropChange}
                                            className="form-input"
                                        />
                                    </div>
                                </div>
                                
                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <textarea
                                        name="description"
                                        value={cropForm.description}
                                        onChange={handleCropChange}
                                        rows="2"
                                        className="form-input"
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <label className="form-label">Planting Date *</label>
                                        <input
                                            type="date"
                                            name="plantingDate"
                                            value={cropForm.plantingDate}
                                            onChange={handleCropChange}
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label className="form-label">Expected Harvest *</label>
                                        <input
                                            type="date"
                                            name="expectedHarvestDate"
                                            value={cropForm.expectedHarvestDate}
                                            onChange={handleCropChange}
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="form-group">
                                        <label className="form-label">Area *</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                name="area.value"
                                                value={cropForm.area.value}
                                                onChange={handleCropChange}
                                                className="form-input flex-1"
                                                min="0"
                                                step="0.1"
                                                required
                                            />
                                            <select
                                                name="area.unit"
                                                value={cropForm.area.unit}
                                                onChange={handleCropChange}
                                                className="form-input w-20"
                                            >
                                                <option value="acres">Acres</option>
                                                <option value="hectares">Ha</option>
                                                <option value="square_meters">m²</option>
                                                <option value="square_feet">ft²</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div className="form-group">
                                        <label className="form-label">Status</label>
                                        <select
                                            name="status"
                                            value={cropForm.status}
                                            onChange={handleCropChange}
                                            className="form-input"
                                        >
                                            <option value="planted">Planted</option>
                                            <option value="growing">Growing</option>
                                            <option value="ready">Ready</option>
                                            <option value="harvested">Harvested</option>
                                            <option value="dormant">Dormant</option>
                                        </select>
                                    </div>
                                    
                                    <div className="form-group">
                                        <label className="form-label">Price ($)</label>
                                        <input
                                            type="number"
                                            name="price"
                                            value={cropForm.price}
                                            onChange={handleCropChange}
                                            className="form-input"
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                </div>
                                
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        name="isOrganic"
                                        checked={cropForm.isOrganic}
                                        onChange={(e) => setCropForm(prev => ({ ...prev, isOrganic: e.target.checked }))}
                                        className="mr-2"
                                    />
                                    <label className="text-sm">Organic</label>
                                </div>
                                
                                <div className="form-group">
                                    <label className="form-label">Notes</label>
                                    <textarea
                                        name="notes"
                                        value={cropForm.notes}
                                        onChange={handleCropChange}
                                        rows="2"
                                        className="form-input"
                                    />
                                </div>
                                
                                <div className="flex gap-2 pt-4">
                                    <button
                                        type="submit"
                                        disabled={uploading}
                                        className="btn btn-primary flex-1"
                                    >
                                        {uploading ? 'Saving...' : (editingCrop ? 'Update Crop' : 'Add Crop')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowCropForm(false);
                                            setEditingCrop(null);
                                            setSelectedFarm(null);
                                            resetCropForm();
                                        }}
                                        className="btn btn-outline"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FarmManager; 